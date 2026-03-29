const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../config/aws");
require("dotenv").config();

async function uploadImage(file) {
    if (!file) return "";
    const fileName = `${Date.now()}-${file.originalname}`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
    }));
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}

async function deleteImage(imageUrl) {
    if (!imageUrl) return;
    try {
        const urlParts = imageUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: decodeURIComponent(fileName)
        }));
    } catch (error) {
        console.error("Lỗi xóa ảnh S3:", error.message);
    }
}

module.exports = { uploadImage, deleteImage };