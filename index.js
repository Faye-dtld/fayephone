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
        // 注意：saveBase64AsFile 的参数签名通常是 (base64, userName, fileName, extension)
        // 但这里的 userName 其实是被用作子文件夹名。
        // 为了确保万无一失，我们直接使用 uploadAsFile (如果可用) 或者确保 saveBase64AsFile 的行为符合预期
        
        // 检查是否是新版 API uploadAsFile (支持 File 对象直接上传，更高效)
        if (window.uploadAsFile) {
             await window.uploadAsFile(file, safeName);
             // uploadAsFile 通常保留原文件名或自动重命名，我们需要确认它的返回值
             // 但为了稳妥，我们还是用 saveBase64AsFile 这种老方法，因为我们已经有了 base64
        }
        
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

/**
 * 获取当前角色信息的辅助函数
 * 供 iframe 内部调用以获取稳定的存储 Key
 */
function getCharacterInfo() {
    try {
        // 1. 尝试使用 TavernHelper (如果可用)
        if (window.TavernHelper) {
            const charData = window.TavernHelper.getCharData('current');
            if (charData) {
                let charId = null;
                // 尝试获取索引 ID
                if (window.TavernHelper.RawCharacter && window.TavernHelper.RawCharacter.findCharacterIndex) {
                    charId = window.TavernHelper.RawCharacter.findCharacterIndex(charData.name);
                }
                
                return {
                    name: charData.name,
                    id: charId,
                    // 如果获取不到 ID，就用名字作为 ID (虽然名字可变，但比没有好)
                    storageKey: charId !== null && charId !== -1 ? `char_id_${charId}` : `char_name_${charData.name}`
                };
            }
        }
        
        // 2. 回退到 SillyTavern 上下文
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const ctx = window.SillyTavern.getContext();
            if (ctx.characterId !== undefined && ctx.characters && ctx.characters[ctx.characterId]) {
                return {
                    name: ctx.characters[ctx.characterId].name,
                    id: ctx.characterId,
                    storageKey: `char_id_${ctx.characterId}`
                };
            }
        }
    } catch (e) {
        console.error("[FayephoneSupport] Error getting character info:", e);
    }
    return null;
}

// 挂载到 window 对象供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;
window.__fayePhoneSupport_getCharInfo = getCharacterInfo;

console.log("FayephoneSupport Adapter (Path Fixed) Loaded");
