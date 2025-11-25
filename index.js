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

    // 优先使用传入的 folderName (即 characterName)，并过滤无效值
    if (folderName && typeof folderName === 'string' && folderName !== '{{char}}' && folderName !== 'undefined') {
        safeName = folderName;
    } else {
        // 回退到 ST 上下文
        try {
            if (window.SillyTavern && window.SillyTavern.getContext) {
                const ctx = window.SillyTavern.getContext();
                const currentCharacterId = ctx.characterId;
                const characters = ctx.characters;
                
                if (characters && currentCharacterId !== undefined && currentCharacterId !== null) {
                    const character = characters[currentCharacterId];
                    if (character && character.name) {
                        safeName = character.name;
                    }
                }
            }
        } catch (e) {
            console.warn("[FayephoneSupport] 获取角色上下文失败:", e);
        }
    }

    // 净化文件名，替换非法字符，防止路径错误
    safeName = safeName.replace(/[\/\\:*?"<>|]/g, '_').trim();
    if (!safeName) safeName = "default";

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
    const fileName = `${fileNamePrefix}.${ext}`;
    const webPath = `/user/images/${safeName}/${fileName}`;
    
    // 直接返回这个标准化的路径
    return { url: webPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Path Fixed) 已加载");
