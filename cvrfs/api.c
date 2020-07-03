
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>

#include <signal.h>
#include <time.h>
#include <ctype.h>
#include <expat.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/statvfs.h>
#include <dirent.h>
#include <fcntl.h>
#include <limits.h>
#include <pthread.h>

#include "logger.h"
#include "module.h"
#include "cvrfs.h"
#include "private.h"
#include "../httpserver/http.h"
#include "../httpserver/multipart_parser.h"


#define HEADER_LENGTH 8192 //2000

//////////////////////////////


enum part {
	PART_UNKNOWN,
	PART_FILENAME,
	PART_FILEDATA
};

const char *parts[] = {
	"(bug)",
	//"sessionid",
	"filename",
	"filedata",
};

struct upload_state
{
	bool is_content_disposition;
	enum part parttype;
	char *filename;
	bool filedata;
	bool has_error;
	struct cvrfs_inode_object *cvr_handle;
	int sent_rsp;
	uint64_t file_size;
};


cJSON *get_post_data(const struct http_msg *msg);

int send_json_response_and_free(struct http_connection *connection, cJSON *dataroot);
cJSON * sendError(int type, const char* path, const char* description) ;
cJSON *generateTargetPutResponse(cJSON *body, const char* targetBase);
static int cvr_read_dir(cJSON *json, const char *dpath);
static void connection_send_rsp(void *connection, const char *body);
int file_copy_out(const char *filename, const char *dir);
static int cvr_fs_open_fp_file(const char *filename, const char *mode, struct file_system_io_interface* fp);

extern char DEFAULT_USERNAME[34];
static pid_t main_pid;

/*
AppKey有效性检查
*/
static inline int is_valid_appid(const char* appid)
{
	if (DEFAULT_USERNAME[0] == 0 || !appid)
	{
		return 0;
	}
	if (strcmp(appid, DEFAULT_USERNAME) == 0)
	{
		return 1;
	}
	return 0;
}

#define CHECK_VALID_USERNAME(msg,connection, param) do{ \
	const char *user = http_request_named_parameter(msg, param); \
	if (is_valid_appid(user) == 0){ \
		cJSON *result = NULL; \
		LOGE("%s() api user '%s': Access denied!",__func__, user); \
		result = sendError(401, "/api", "Access denied"); \
		send_json_response_and_free(connection, result); \
		return 1; \
	} \
} \
while (0)

int http_connection_send_cvr(struct http_connection *connection,
	const struct http_msg *msg, const char *uri);

static int cvr_read_dir(cJSON *json, const char *dirpath)
{
	int count = 0;
	struct cvrfs_inode_object *e;
	struct cvrfs_object *fs = cvr_fs_get();
	struct cvrfs_inode_object *root = cvr_fs_root_get(fs);

	cvr_fs_file_seek(root, 0,SEEK_SET);

	while ((e = cvr_fs_read_dir(root, NULL)) != NULL)
	{
		cJSON *success2 = cJSON_CreateObject();
		if ((e->attribute & CVR_FS_ATTR_VIDEO_FILE) == CVR_FS_ATTR_VIDEO_FILE)
		{
			cJSON_AddStringToObject(success2, "type", "video");
		}
		else if ((e->attribute & CVR_FS_ATTR_INDEX_FILE) == CVR_FS_ATTR_INDEX_FILE){
			cJSON_AddStringToObject(success2, "type", "index");
		}
		else if ((e->attribute & CVR_FS_ATTR_DIR) == CVR_FS_ATTR_DIR){
			cJSON_AddStringToObject(success2, "type", "dir");
		}
		else{
			cJSON_AddStringToObject(success2, "type", "unknow");
		}

		char tmp[128];
		snprintf(tmp,sizeof(tmp),"%04d-%02d-%02d %02d:%02d:%02d",
			e->adate.year+2000,e->adate.month,e->adate.day_of_month,
			e->atime.hour,e->atime.min,e->atime.sec
			);

		cJSON_AddStringToObject(success2, "name", e->long_name);
		cJSON_AddStringToObject(success2, "time", tmp);
		cJSON_AddNumberToObject(success2, "size", e->file_size);
		cJSON_AddNumberToObject(success2, "attribute", e->attribute);
		cJSON_AddNumberToObject(success2, "pre_allocated", e->alloc_size);
		cJSON_AddNumberToObject(success2, "channel", e->channel);
		cJSON_AddNumberToObject(success2, "first_cluster", e->first_cluster);
		cJSON_AddItemToArray(json, success2);
		count++;
	}
	cvr_fs_file_seek(root, 0,SEEK_SET);
	return 0;
}

/*
获取直存文件根目录文件列表
*/
static int api_get_dirs_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	cJSON *resp;
	const char *path = NULL;
	CHECK_VALID_USERNAME(msg, connection, "username");

	path = http_request_query_parameter(msg, "path");
	if (path == NULL)
	{
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;
	}	
	resp = cJSON_CreateArray();
	cvr_read_dir(resp, path);
	send_json_response_and_free(connection, resp);	
	return 1;
}

/*
获取直存文件超级块信息
*/
static int api_get_sdinfo_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	cJSON *resp;
	extern char cvrroot[256];

	CHECK_VALID_USERNAME(msg, connection, "username");
	resp = cJSON_CreateObject();
	struct cvrfs_object *fs = cvr_fs_get();
	if (fs)
	{
		cvrfs_clusters_statistical(fs);
		cJSON_AddStringToObject(resp, "device", cvrroot);
		cJSON_AddStringToObject(resp, "oem", fs->oem);
		cJSON_AddNumberToObject(resp, "used_clusters", fs->used_clusters);
		cJSON_AddNumberToObject(resp, "total_clusters", fs->n_clusters);
		cJSON_AddNumberToObject(resp, "version", fs->fs_version);
		cJSON_AddNumberToObject(resp, "used", 
			(unsigned long long)fs->used_clusters*fs->block_size);
		cJSON_AddNumberToObject(resp, "total", 
			(unsigned long long)fs->n_clusters*fs->block_size);
	}	
	send_json_response_and_free(connection, resp);	
	return 1;
}

/*
下载Linux文件系统内的文件
*/
static int api_get_file_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	const char *filename = NULL;
	char path[1024];

	CHECK_VALID_USERNAME(msg, connection, "username");
	filename = http_request_named_parameter(msg, "filename");
	if (filename == NULL)
	{
		LOGE("Open filename %s Fail", filename);
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;
	}
	snprintf(path,sizeof(path),"$sda1/%s",filename);
	LOGI("Open file %s", path);
	http_connection_send_file(connection,msg,path);
	return 1;
}
/*
下载CVR直存文件
*/
static int api_get_cvr_file_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	const char *filename = NULL;

	CHECK_VALID_USERNAME(msg, connection, "username");
	filename = http_request_named_parameter(msg, "filename");
	if (filename == NULL)
	{
		LOGE("Open filename %s Fail", filename);
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;
	}
	LOGI("Open file %s", filename);
	http_connection_send_cvr(connection,msg,filename);
	return 1;
}

/*
删除直存文件
*/
static int api_rm_file_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	const char *path = NULL;
	CHECK_VALID_USERNAME(msg, connection, "username");

	path = http_request_query_parameter(msg, "path");
	if (path == NULL)
	{
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;
	}
	struct cvrfs_object *fs = cvr_fs_get();
	struct cvrfs_inode_object *root = cvr_fs_root_get(fs);
	int rc = cvr_fs_delete_file(root,path);
	if (rc < 0)
	{
		connection_send_rsp(connection, "FAIL");
	}
	else{
		connection_send_rsp(connection, "OK");
	}
	return 1;
}


/*
makefs
*/
static void * make_fs_thread_enry(void *arg)
{
	char *path = arg;

	if (path != NULL)
	{	
		LOGI("CVR make fs entry %s", path);
		//create_fs("/mnt/sda1/cvrfs.img",1024*1024*1024);
		cvr_fs_make(path, NULL, CLUSTER_SIZE);
		free(path);
	}
	LOGI("CVR makefs Okey!");
	kill(main_pid, SIGTERM); /*Exit current process*/
	pthread_exit(NULL);  
	return NULL;
}

/*
格式化CVR直存文件
*/
static int api_make_fs_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	const char *path = NULL;
	CHECK_VALID_USERNAME(msg, connection, "username");

	path = http_request_query_parameter(msg, "path");
	if (path == NULL)
	{
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;
	}

	struct cvrfs_object *fs = cvr_fs_get();
	if (fs)
	{
		cvr_fs_unmount(fs);
		LOGI("umount fs OK");
	}

	pthread_t thread_id; 
	/*需要创建线程处理，否则会导致进程阻塞，被监视进程强制kill*/
	int rc = pthread_create(&thread_id, NULL, 
		make_fs_thread_enry, strdup(path)); 
	if (rc < 0)
	{
		connection_send_rsp(connection, "FAIL");
	}
	else{
		connection_send_rsp(connection, "OK");
	}
	return 1;
}

static void * copy_out_thread_enry(void *arg)
{
	char *path = arg;

	if (path != NULL)
	{	
		LOGI("CVR copy out file %s", 		path);
		file_copy_out(path, "/mnt/sda1/");
		free(path);
	}
	LOGI("CVR copy out Okey!");
	pthread_exit(NULL);  
	return NULL;
}


static int api_copy_out_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	const char *path = NULL;
	CHECK_VALID_USERNAME(msg, connection, "username");

	path = http_request_query_parameter(msg, "path");
	if (path == NULL)
	{
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;
	}

	pthread_t thread_id; 
	/*需要创建线程处理，否则会导致进程阻塞，被监视进程强制kill*/
	int rc = pthread_create(&thread_id, NULL, copy_out_thread_enry, strdup(path)); 
	if (rc < 0)
	{
		connection_send_rsp(connection, "FAIL");
	}
	else{
		connection_send_rsp(connection, "OK");
	}
	return 1;
}

/*
将CVR直存文件复制出到Linux文件系统
*/
int file_copy_out(const char *filename, const char *dir)
{
	int len;
	char buf[CLUSTER_SIZE];
	char path[1024];

	struct cvrfs_inode_object *ino;
	struct cvrfs_object *fs = cvr_fs_get();
	struct cvrfs_inode_object *root = cvr_fs_root_get(fs);

	ino = cvr_fs_open_file(root,filename,"r");
	if (!ino)
	{
		LOGI("copy file %s not found!", filename);
		return -1;
	}

	snprintf(path,sizeof(path), "%s/%s", dir,filename);
	int filefd = open(path, O_CREAT | O_TRUNC | O_WRONLY, 0666);
	if (filefd < 0)
	{
		LOGE( "Failed to open target file %s: %s", path,strerror(errno));
		cvr_fs_close_inode(ino);
		return -1;
	}

	while ((len = cvr_fs_file_read(ino, buf, sizeof(buf))) > 0)
	{
		if (write(filefd, buf, len) != len)
		{
			cvr_fs_close_inode(ino);
			close(filefd);
			LOGE( "I/O failure while writing target file %s: %s", filename,strerror(errno));
			return -1;
		}
	}
	cvr_fs_close_inode(ino);
	close(filefd);
	if (chmod(path, 0666)){ //filemode
		LOGI( "Failed to chmod target file %s: %s", filename,strerror(errno));
		return -1;
	}
	LOGI("save as file %s",filename);	
	return 0;
}

/*
上传功能调用
*/
static int
header_field(multipart_parser *p, const char *data, size_t len)
{
	struct upload_state *state = multipart_parser_get_param(p);
	state->is_content_disposition = !strncasecmp(data, "Content-Disposition", len);
	return 0;
}

static int
header_value(multipart_parser *p, const char *data, size_t len)
{
	int i, j;
	struct upload_state *state = multipart_parser_get_param(p);

	if (!state->is_content_disposition)
		return 0;

	if (len < 10 || strncasecmp(data, "form-data", 9))
		return 0;

	for (data += 9, len -= 9; *data == ' ' || *data == ';'; data++, len--);

	if (len < 8 || strncasecmp(data, "name=\"", 6)){
		LOGI(" -->skip data %s", data);
		return 0;
	}
	//LOGI(" --> data %s", data);

	for (data += 6, len -= 6, i = 0; i <= len; i++)
	{
		char *next_step = NULL;
		if (*(data + i) != '"')
			continue;

		next_step=strchr(data,';');
		if (next_step != NULL)
		{
			len -= (next_step - data) + 1;
			data = next_step+1;
			
			for (; *data == ' ' ; data++){len--;}
			//LOGI(" --> Step '%s'", data);
		}
//--> data name="txt_file"; filename="VisualActivTV.mp4"
//--> Data txt_file"; filename="VisualActivTV.mp4"


		for (j = 1; j < sizeof(parts) / sizeof(parts[0]); j++)
			if (!strncmp(data, parts[j], i))
				state->parttype = j;
		LOGI(" --> Data %s, parttype %d", data, state->parttype);

		if (state->parttype == PART_FILENAME)
		{
			char tmp[1024];
			memset(tmp,0,sizeof(tmp));
			sscanf(data, "filename=\"%s\"", tmp);
			for (int x=0; tmp[x] ; x++){
				if (tmp[x] == '"')
				{
					tmp[x]  = 0;
				}
			}
			asprintf(&state->filename, "%x_%s",(uint16_t)time(NULL), tmp);
			LOGI(" --> Filename '%s'", state->filename);
			state->parttype = PART_FILEDATA;
		}
		else{
			if (state->filename != NULL)
			{
				free(state->filename);
				state->filename = NULL;
			}
		}

		break;
	}

	return 0;
}

static int data_begin_cb(multipart_parser *p)
{
	struct upload_state *state = multipart_parser_get_param(p);

	if (state->parttype == PART_FILEDATA)
	{
		struct cvrfs_object *fs = cvr_fs_get();
		struct cvrfs_inode_object *root = NULL;
		int rc;

		if (!state->filename){
			LOGE( "File data without name");
			return -1;
		}
		root = cvr_fs_root_get(fs);
		rc = cvr_fs_create_file(root, state->filename, state->file_size?state->file_size:15*1024*1024);
		if (rc < 0)
		{
			LOGI("Create failed for %s", state->filename);
			state->has_error = 1;
			return -1;
		}
		state->cvr_handle = cvr_fs_open_file(root, state->filename, "w");
		if (state->cvr_handle == NULL)
		{
			LOGI("Open failed for %s", state->filename);
			state->has_error = 1;
			return -1;
		}		
	}
	else{
		LOGI("data begin parttype: %d", state->parttype);
	}
	return 0;
}


static int data_cb(multipart_parser *p, const char *data, size_t len)
{
	struct upload_state *state = multipart_parser_get_param(p);
	int rc;

	switch (state->parttype)
	{
	case PART_FILEDATA:		
		if (!len)
		{
			//LOGI("Nil DATA %d", (int)len);
			break;
		}

		rc = cvr_fs_file_write(state->cvr_handle, data, len);
		if (rc != len)
		{
			LOGE( "I/O failure while writing temporary file: %s",strerror(errno));
			state->has_error = 1;
			//cvr_fs_close_inode(state->cvr_handle);
			//state->cvr_handle = NULL;
			//return -1;
		}
		if (!state->filedata)
			state->filedata = !!len;
		break;
	default:
		break;
	}

	return 0;
}

static int
data_end_cb(multipart_parser *p)
{
	struct upload_state *state = multipart_parser_get_param(p);
	//LOGI("upload end parttype: %d", state->parttype);
	
	if (state->parttype == PART_FILEDATA)
	{		
		if (state->cvr_handle)
		{
			cvr_fs_close_inode(state->cvr_handle);
			state->cvr_handle = NULL;
		}
		if (state->filename != NULL)
		{			
			free(state->filename);
			state->filename = NULL;
		}
		return 0;
	}
	state->parttype = PART_UNKNOWN;
	return 0;
}

static multipart_parser *
init_parser(const struct http_msg *msg)
{
	char *boundary;
	const char *var;
	uint64_t file_size = 0;

	multipart_parser *p;
	static multipart_parser_settings s = {
		.on_part_data        = data_cb,
		.on_headers_complete = data_begin_cb,
		.on_part_data_end    = data_end_cb,
		.on_header_field     = header_field,
		.on_header_value     = header_value
	};
	var = http_msg_get_header(msg, "Content-Length"); 
	if (var != NULL)
	{
		LOGI("File size '%s'", var);
		file_size = strtoll(var,NULL,10);
	}

	var = http_msg_get_header(msg, "Content-Type");  
	if (!var || strncmp(var, "multipart/form-data;", 20))
		return NULL;
	for (var += 20; *var && *var != '='; var++);
	if (*var++ != '=')
		return NULL;
	boundary = malloc(strlen(var) + 3);
	if (!boundary)
		return NULL;
	strcpy(boundary, "--");
	strcpy(boundary + 2, var);

	struct upload_state *state = (struct upload_state *)calloc(1, sizeof(struct upload_state));
	state->sent_rsp = 0;
	state->cvr_handle = NULL;
	state->file_size = file_size;
	p = multipart_parser_init(boundary, &s);
	multipart_parser_set_param(p, state);
	free(boundary);
	return p;
}

static void upload_connection_destroy_cb(void *connection, void* arg)
{
	struct upload_state *state;
	multipart_parser* p = http_connection_get_read_object(connection);
	if (!p)
	{
		return;
	}
	state = multipart_parser_get_param(p);
	if (state->filename != NULL)
	{
		free(state->filename);
		state->filename = NULL;
	}
	free(state);	
	multipart_parser_free(p);
}

static void connection_send_rsp(void *connection, const char *body)
{
	struct http_headers *headers;

	headers = http_headers_new();	
	http_headers_set_header(headers, "Server", "RaftLink Homehub");
	http_headers_set_header(headers, "Content-Type", "text/plain");
	http_connection_send_response_with_body(connection, HTTP_OK, headers,
								body, strlen(body));	
}


static void upload_connection_read_cb(void *connection, const void* data, int datalen)
{
	int rem = 0;
	multipart_parser* p = NULL;	

	p = http_connection_get_read_object(connection);
	if (!p)
	{
		LOGE("http_connection_get_read_object FAILED");
		return;
	}
	struct upload_state *state = multipart_parser_get_param(p);
	if (state->has_error)
	{
		LOGE("http_connection_get_read_object shutdown");
		int fd = http_connection_get_fd(connection);
		if (fd >= 0)
		{
			close(fd);
		}
		return;
	}

	if (!data || !datalen)
	{	
		if (state->sent_rsp == 0)
		{
			state->sent_rsp = 1;
			connection_send_rsp(connection, "{}");
		}
		//http_connection_abort(connection);
		return;
	}	

	rem = multipart_parser_execute(p, data, datalen);
	if (rem < datalen)
	{
		LOGE("multipart_parser_execute FAILED");
	}
	else{
		//LOGI("multipart_parser_execute %d bytes", datalen);
	}
}

/*
HTTP上传文件到CVR直存系统
*/
static int api_upload_file_cb(struct http_connection *connection, const struct http_msg *msg, void *arg)
{
	multipart_parser *p;

	p = init_parser(msg);
	if (!p)
	{
		LOGI("multipart parser init error");
		http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
		return 1;//response(false, "Invalid request");
	}	
	http_connection_set_destroy_handle(connection, 
		upload_connection_destroy_cb, p);
	http_connection_set_read_handle(connection, 
		upload_connection_read_cb, p);	
	LOGI("ready go %d !", http_msg_body_length(msg));
	return 0;
}

/*
跨文件系统访问对象实现
*/

static int cvr_fd_seek_cb(struct file_system_io_interface *ri, off_t pos, int s)
{
	LOGI("seek %d -> %lld", s,pos);
	return cvr_fs_file_seek(ri->private_data, pos,s);
}

static int cvr_fd_destroy_cb(struct file_system_io_interface *ri)
{
	if (!ri)
	{
		LOGI("%s() Error data point", __func__);
		return -1;
	}
	if (!ri->private_data)
	{
		LOGI("%s() Error private_data point", __func__);
		return -1;
	}
	int rc = cvr_fs_close_inode(ri->private_data);
	ri->private_data = NULL;
	return rc;
}

static int cvr_fd_read_cb(struct file_system_io_interface *ri, void *buf, size_t count)
{
	int ret;
	if (!ri)
	{
		LOGI("%s() Error data point", __func__);
		return -1;
	}
	ret = cvr_fs_file_read(ri->private_data, buf,count);
	if (ret != count)
	{
		LOGI("Read Error at %p, got %d of %d bytes", ri, ret,(int)count);
	}
	return ret;
}


static int cvr_fd_write_cb(struct file_system_io_interface *ri, const void *buf, size_t count)
{
	int ret;

	if (!ri)
	{
		LOGI("%s() Error data point", __func__);
		return -1;
	}
	ret = cvr_fs_file_write(ri->private_data, buf, count);
	return ret;
}

static const struct file_op_interface _cvr_op = {
	destroy : cvr_fd_destroy_cb,
	seek : cvr_fd_seek_cb,
	read : cvr_fd_read_cb,
	write : cvr_fd_write_cb
};

/*
为CVR直存系统构建跨文件系统访问对象，linux文件系统以类似的形态创建
*/
static void set_file_read_interface_for_cvrfs(struct file_system_io_interface* fp, struct cvrfs_inode_object *ino)
{
	memset(fp,0,sizeof(struct file_system_io_interface));
	fp->file_op = &_cvr_op;
	fp->private_data = ino;
	if ((ino->attribute & CVR_FS_ATTR_DIR) == CVR_FS_ATTR_DIR){
		fp->is_regular_file = 0;
	}
	else{
		fp->is_regular_file = 1;
	}
	return ;
}

int http_connection_send_cvr(struct http_connection *connection,
	const struct http_msg *msg, const char *uri)
{
	struct file_system_io_interface _fp;
	struct cvrfs_inode_object *ino;
	struct cvrfs_object *fs = cvr_fs_get();
	struct cvrfs_inode_object *root = cvr_fs_root_get(fs);

	ino = cvr_fs_open_file(root,uri,"r");
	if (!ino)
	{
		LOGI("open cvr file %s not found!", uri);
		 if (errno == ENOENT) {
            http_connection_send_error(connection, HTTP_NOT_FOUND, NULL);
        } else {
            http_connection_send_error(connection, HTTP_INTERNAL_SERVER_ERROR,
                                       "cannot open file %s: %s",
                                       uri, strerror(errno));
        }
		return -2;
	}

    if (ino->file_size == 0) {
        http_connection_send_error(connection, HTTP_INTERNAL_SERVER_ERROR,
                                   "cannot stat file %s: %s",
                                   uri, strerror(errno));
        return -2;
    }

	set_file_read_interface_for_cvrfs(&_fp, ino);
	int rc = http_connection_send_fp_file(connection,msg,uri, &_fp,0,ino->file_size);
	if (rc != 1)
	{
		LOGI("Send cvr file %d fail", rc);
	}
	return rc;
}

static int cvr_fs_open_fp_file(const char *filename, const char *mode, struct file_system_io_interface* fp)
{
	struct cvrfs_inode_object *ino;
	struct cvrfs_object *fs = cvr_fs_get();
	struct cvrfs_inode_object *root = cvr_fs_root_get(fs);
	char *file = basename(filename);

	ino = cvr_fs_open_file(root,file,mode);
	if (!ino)
	{
		return -1;
	}
	set_file_read_interface_for_cvrfs(fp, ino);
	return 0;
}

/*
http://192.168.16.200:8080/api/1ab46668c3f5eb07ad6465ee479bd064/cvr/copy?path=3d28_aa1.mp4
http://192.168.16.200:8080/api/1ab46668c3f5eb07ad6465ee479bd064/cvr/rm?path=4799_3.jpg
http://192.168.16.200:8080/api/1ab46668c3f5eb07ad6465ee479bd064/cvr/makefs?path=/mnt/sda1/cvrfs.img
*/

int cvrfs_api_init(void *base)
{
	void *http_server = get_web_server_object();
	if (!http_server)
	{
		return -1;
	}

	main_pid = getpid();

	http_server_add_route(http_server, HTTP_POST, "/api/:username/cvr/upload", api_upload_file_cb, NULL);
	http_server_add_route(http_server, HTTP_GET, "/api/:username/cvr/dirs", api_get_dirs_cb, NULL);
	http_server_add_route(http_server, HTTP_GET, "/api/:username/cvr/sdinfo", api_get_sdinfo_cb, NULL);
	http_server_add_route(http_server, HTTP_GET, "/api/:username/storage/:filename", api_get_file_cb, NULL);	
	http_server_add_route(http_server, HTTP_GET, "/api/:username/cvrstorage/:filename", api_get_cvr_file_cb, NULL);	
	http_server_add_route(http_server, HTTP_GET, "/api/:username/cvr/rm", api_rm_file_cb, NULL);	
	http_server_add_route(http_server, HTTP_GET, "/api/:username/cvr/makefs", api_make_fs_cb, NULL);	
	http_server_add_route(http_server, HTTP_GET, "/api/:username/cvr/copy", api_copy_out_cb, NULL);	
	
	/*for ip camera storage*/
	register_file_system_call(cvr_fs_open_fp_file);
	return 0;
}
