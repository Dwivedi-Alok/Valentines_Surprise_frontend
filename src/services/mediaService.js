import api from './api';

export const mediaService = {
    // Get presigned upload URL
    async getUploadUrl({ fileName, contentType, type }) {
        const response = await api.get('/presigned/upload', {
            params: { fileName, contentType, type }
        });
        return response.data;
    },

    // Upload file to S3
    async uploadToS3(uploadUrl, file) {
        await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });
    },

    // Save media record after upload
    async saveMedia({ type, title, description, s3_key, content_type, size_bytes }) {
        const response = await api.post('/media', {
            type,
            title,
            description,
            s3_key,
            content_type,
            size_bytes,
        });
        return response.data;
    },

    // Get all media
    async getMedia() {
        const response = await api.get('/media');
        return response.data;
    },

    // Get view URL for a media file
    async getViewUrl(key) {
        const response = await api.get('/presigned/view', { params: { key } });
        return response.data;
    },

    // Delete media
    async deleteMedia(id) {
        const response = await api.delete(`/media/${id}`);
        return response.data;
    },
};

export default mediaService;
