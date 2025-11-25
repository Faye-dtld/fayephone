import {
    getBase64Async,
    saveBase64AsFile,
    getStringHash
} from "../../../utils.js";

// 核心上传函数 - 修复版
async function adapterUpload(file, folderName) {
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
    let safeName = "default";

    // 优先使用传入的 folderName，并进行更严格的检查
    if (folderName && typeof folderName === 'string' && folderName.trim() !== '' && folderName !== '{{char}}') {
        safeName = folderName;
    } else {
        // 回退到 ST 上下文 (尝试从 window.SillyTavern 获取)
        try {
            if (window.SillyTavern && window.SillyTavern.getContext) {
                const ctx = window.SillyTavern.getContext();
                if (ctx.characters && ctx.characterId) {
                    const char = ctx.characters[ctx.characterId];
                    if (char && char.name) safeName = char.name;
                }
            }
        } catch (e) {
            console.warn("[FayephoneSupport] 获取角色上下文失败:", e);
        }
    }

    // 净化文件名
    // 移除路径分隔符，防止目录穿越
    safeName = safeName.replace(/[\/\\:*?"<>|]/g, '_').trim();
    if (!safeName) safeName = "default";

    // 构建物理保存目录: UserUploads/角色名
    // 确保 UserUploads 和 角色名 之间有分隔符
    const uploadDir = `UserUploads/${safeName}`;

    // 4. 生成文件名
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;

    // 5. 保存文件
    // 注意：saveBase64AsFile 通常会自动处理 UserUploads 根目录，但这里明确指定子目录
    try {
        const savedPath = await saveBase64AsFile(
            base64Data,
            uploadDir, 
            fileNamePrefix,
            ext
        );
        console.log("[FayephoneSupport] 文件已保存:", savedPath);
    } catch (err) {
        console.error("[FayephoneSupport] 保存文件失败:", err);
        throw new Error("文件保存失败，请检查 UserUploads 目录权限或是否存在。");
    }

    // 6. 构造 Web 访问路径
    // 强制格式: /user/images/角色名/文件名.ext
    // 这里的 safeName 必须与 uploadDir 中的一致，且不包含 UserUploads 前缀
    const fileName = `${fileNamePrefix}.${ext}`;
    const webPath = `/user/images/${safeName}/${fileName}`;
    
    // 返回结果
    return { url: webPath };
}

// 挂载到 window
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Path Fixed) 已加载");
