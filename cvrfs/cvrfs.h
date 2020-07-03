#ifndef _CVRFS_TREE_H
#define _CVRFS_TREE_H

struct cvrfs_object;
struct cvrfs_inode_object;

/**/
typedef uint32_t cluster_id_t;

/*makefs*/
int cvr_fs_make(const char*block_device, const uint8_t*aes_key, int cluster_size);

/*mount*/
struct cvrfs_object * cvr_fs_mount(const char*block_device, const uint8_t *aes_iv);
int cvr_fs_unmount(struct cvrfs_object *obj);

/*super block*/
struct cvrfs_inode_object *cvr_fs_root_get(struct cvrfs_object *obj);

/*create entrires*/
int cvr_fs_create_dir(struct cvrfs_inode_object *parent,const char *name,uint64_t pre_allocated);
int cvr_fs_create_file(struct cvrfs_inode_object *parent,const char *name,uint64_t pre_allocated);

/*delete inode*/
int cvr_fs_delete_file(struct cvrfs_inode_object *parent,const char *name);
int cvr_fs_delete_inode(struct cvrfs_inode_object *ino);

/*directory*/
struct cvrfs_inode_object *cvr_fs_open_dir(struct cvrfs_inode_object *parent,const char *name);
/*暂时不支持多级目录*/
struct cvrfs_inode_object *cvr_fs_read_dir(struct cvrfs_inode_object *ino, uint64_t *offset);

/*file*/
struct cvrfs_inode_object *cvr_fs_open_file(struct cvrfs_inode_object *parent,const char *name, const char *mode);
int cvr_fs_close_inode(struct cvrfs_inode_object *ino);
int cvr_fs_file_seek(struct cvrfs_inode_object *ino, uint64_t pos, int which);
int cvr_fs_file_truncate(struct cvrfs_inode_object *ino, uint64_t new_size);
int cvr_fs_file_read(struct cvrfs_inode_object *ino, void *buffer, uint64_t size);
int cvr_fs_file_write(struct cvrfs_inode_object *ino, const void *buffer, int64_t size);
int cvr_fs_ref_inode(struct cvrfs_inode_object *ino);

/*flush cache*/
int cvr_fs_flush_inode(struct cvrfs_inode_object *ino);

/*cluster*/
struct cvrfs_inode_object *cvr_fs_lookup(struct cvrfs_inode_object *parent, const char *name, uint64_t *off);
int cvr_fs_file_reload_cluster(struct cvrfs_inode_object *ino);

#endif
