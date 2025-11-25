import {
    getBase64Async,
    saveBase64AsFile,
    getStringHash
} from "../../../utils.js";

/**
 * 核心上传函数 - 修复路径与上下文获取
 * @param {File} file - 要上传的文件对象
 * @param {string} [folderNameFromFrontend] - 前端传入的角色名（作为备用）
 */
async function adapterUpload(file, folderNameFromFrontend) {
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

    // 3. 获取准确的角色名 (作为保存文件夹)
    let safeName = "default";

    // 优先尝试从 SillyTavern 上下文获取
    try {
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            // 上下文中的 characters 可能是 Promise (新版ST) 或直接对象
            let characters = ctx.characters;
            if (characters instanceof Promise) {
                characters = await characters;
            }
            
            const charId = ctx.characterId;
            if (characters && characters[charId]) {
                 safeName = characters[charId].name;
            }
        }
    } catch (e) {
        console.warn("[FayephoneSupport] Context fetch failed, falling back:", e);
    }

    // 如果上下文获取失败，回退到前端传入的名字
    if ((!safeName || safeName === "default") && folderNameFromFrontend && typeof folderNameFromFrontend === 'string' && folderNameFromFrontend !== '{{char}}') {
        safeName = folderNameFromFrontend;
    }

    // 净化文件名，移除路径分隔符等非法字符
    safeName = safeName.replace(/[\/\\:*?"<>|]/g, '_').trim();
    if (!safeName) safeName = "default";

    // 4. 生成文件名
    const fileNamePrefix = `${Date.now()}_${getStringHash(file.name)}`;

    // 5. 保存文件
    // 关键修改：第二个参数只传 safeName (角色名)。
    // SillyTavern 的 saveBase64AsFile 会自动将其视为 UserUploads 下的子文件夹。
    try {
        await saveBase64AsFile(
            base64Data,
            safeName, 
            fileNamePrefix,
            ext
        );
        console.log(`[FayephoneSupport] File saved to UserUploads/${safeName}/${fileNamePrefix}.${ext}`);
    } catch (err) {
        console.error("[FayephoneSupport] Save failed:", err);
        throw new Error("文件保存失败: " + err.message);
    }

    // 6. 构造路径
    const fileName = `${fileNamePrefix}.${ext}`;
    
    // Web 路径: 用于前端 img 标签显示 (通过 ST 的静态文件路由)
    const webPath = `/user/images/${safeName}/${fileName}`;

    // 文件系统路径: 用于传给 AI 生成函数 (ST 后端读取)
    // 注意：ST 通常期望相对于根目录的路径，或者 UserUploads 开头的路径
    const filePath = `UserUploads/${safeName}/${fileName}`;
    
    return { url: webPath, filePath: filePath };
}

// 挂载到 window 对象供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport Adapter (Path Fixed) Loaded");
