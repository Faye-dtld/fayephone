
import {
    getBase64Async,
    saveBase64AsFile,
    getStringHash
} from "../../../utils.js";

// 核心上传函数 - 复刻 Olivia-s-Toolkit (朋友的插件) 逻辑
// 这种方式利用了酒馆原生的上下文处理，生成的路径最容易被后端 AI 识别
async function adapterUpload(file) {
    if (!file) throw new Error("未检测到文件");

    // 1. 获取 Base64 数据
    const base64Full = await getBase64Async(file);
    const base64Data = base64Full.split(",")[1];
    
    // 2. 确定扩展名
    let ext = 'png';
    if (file.type.startsWith('image/')) {
        ext = file.type.split('/')[1] || 'png';
    } else if (file.type.startsWith('audio/')) {
        ext = file.type.split('/')[1] || 'mp3';
    } else if (file.type.startsWith('video/')) {
        ext = file.type.split('/')[1] || 'mp4';
    }

    // 3. 获取上下文并构建路径
    // 关键修改：默认基础目录必须是 UserUploads，否则后端不识图
    let uploadDir = "UserUploads"; 

    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            const currentCharacterId = ctx.characterId;
            const characters = ctx.characters;
            
            if (characters && currentCharacterId !== undefined && currentCharacterId !== null) {
                const character = characters[currentCharacterId];
                if (character && character.name) {
                    // 关键修改：将角色名作为 UserUploads 的子文件夹
                    // 这样既保证了文件按角色分类，又让路径以 UserUploads 开头，告诉 AI 这是用户上传的
                    // 增加 sanitize 逻辑，防止特殊字符导致路径拼接错误
                    const safeName = character.name.replace(/[\/\\:*?"<>|]/g, '_').trim();
                    uploadDir = `UserUploads/${safeName}`;
                }
            }
        }
    } catch (e) {
        console.warn("[FayephoneSupport] 获取角色上下文失败:", e);
    }

    // 4. 生成文件名
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;

    // 5. 保存文件
    // saveBase64AsFile 会自动处理路径分隔符
    // 返回的路径通常是相对路径 (例如 UserUploads/Name/file.png)
    const savedPath = await saveBase64AsFile(
        base64Data,
        uploadDir, // 传入 "UserUploads/角色名"
        fileNamePrefix,
        ext
    );

    console.log("[FayephoneSupport] 文件已保存:", savedPath);
    
    return { url: savedPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Standard) 已加载");
