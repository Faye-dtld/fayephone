
import {
    getBase64Async,
    saveBase64AsFile,
    getStringHash
} from "../../../utils.js";

// 核心上传函数 - 修复版
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
    // 强制使用 UserUploads 作为根目录，这是酒馆后端识别图片附件的关键白名单目录
    let uploadDir = "UserUploads"; 

    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            const currentCharacterId = ctx.characterId;
            const characters = ctx.characters;
            
            if (characters && currentCharacterId !== undefined && currentCharacterId !== null) {
                const character = characters[currentCharacterId];
                if (character && character.name) {
                    // 关键修复：确保路径分隔符存在
                    // 将非法字符替换为下划线，并构建 UserUploads/角色名 结构
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
    const savedPath = await saveBase64AsFile(
        base64Data,
        uploadDir, 
        fileNamePrefix,
        ext
    );

    console.log("[FayephoneSupport] 文件已保存:", savedPath);
    
    // saveBase64AsFile 返回的路径通常是 "UserUploads/Name/file.png" (相对路径)
    // 我们直接返回这个相对路径，交给 index.html 去处理显示前缀
    return { url: savedPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Fixed) 已加载");
