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
    let safeName = "default";

    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            const currentCharacterId = ctx.characterId;
            const characters = ctx.characters;
            
            if (characters && currentCharacterId !== undefined && currentCharacterId !== null) {
                const character = characters[currentCharacterId];
                if (character && character.name) {
                    // 替换非法字符，避免文件夹名称错误
                    safeName = character.name.replace(/[\/\\:*?"<>|]/g, '_').trim();
                }
            }
        }
    } catch (e) {
        console.warn("[FayephoneSupport] 获取角色上下文失败:", e);
    }

    // 构建物理保存目录 (UserUploads/角色名)
    const uploadDir = `UserUploads/${safeName}`;

    // 4. 生成文件名
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;

    // 5. 保存文件 (物理保存)
    const savedPath = await saveBase64AsFile(
        base64Data,
        uploadDir, 
        fileNamePrefix,
        ext
    );

    console.log("[FayephoneSupport] 文件已保存:", savedPath);
    
    // 6. 构造 Web 访问路径 (强制格式: /user/images/角色名/文件名.ext)
    // 注意：saveBase64AsFile 保存的文件名是 prefix + '.' + ext
    const fileName = `${fileNamePrefix}.${ext}`;
    const webPath = `/user/images/${safeName}/${fileName}`;
    
    // 直接返回这个标准化的路径，前端不再需要做任何 UserUploads 的转换
    return { url: webPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Path Fixed) 已加载");
