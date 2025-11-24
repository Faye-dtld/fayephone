
import { getContext } from "../../../extensions.js";
import {
    getBase64Async,
    saveBase64AsFile,
} from "../../../utils.js";

// 辅助函数：简单的字符串哈希，用于生成短文件名
function getStringHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

// 核心上传函数 - 模仿 Olivia-s-Toolkit 逻辑
async function adapterUpload(file) {
    if (!file) throw new Error("未检测到文件");

    console.log("[FayephoneSupport] 正在处理文件:", file.name, file.type);

    // 1. 获取 Base64 数据
    const base64Full = await getBase64Async(file);
    const base64Data = base64Full.split(",")[1];
    
    // 2. 确定文件扩展名
    let ext = 'png';
    if (file.name.includes('.')) {
        ext = file.name.split('.').pop();
    } else if (file.type.includes('/')) {
        ext = file.type.split('/')[1];
    }

    // 3. 获取当前上下文和角色信息
    const context = getContext();
    let charName = "UserUploads";

    try {
        // 尝试获取当前聊天的角色名
        if (context.characterId !== undefined && context.characters) {
            const charId = context.characterId;
            const characters = context.characters;
            // 直接读取角色名，不进行额外的手动净化，交由 saveBase64AsFile 处理
            // 这样可以确保如果系统允许中文文件夹，我们能正确匹配
            if (characters[charId] && characters[charId].name) {
                charName = characters[charId].name;
            }
        } else if (context.name) {
            charName = context.name;
        }
    } catch (e) {
        console.warn("[FayephoneSupport] 获取角色信息失败，将使用默认文件夹", e);
        charName = "UserUploads";
    }

    // 4. 生成文件名 (时间戳 + 哈希)
    const fileName = `${Date.now()}_${getStringHash(file.name)}`;

    console.log(`[FayephoneSupport] 保存目标: Character=${charName}, File=${fileName}.${ext}`);

    // 5. 调用酒馆内部函数保存文件
    const savedPath = await saveBase64AsFile(
        base64Data,
        charName,
        fileName,
        ext
    );

    // 6. 路径标准化与解码 (关键修复)
    // saveBase64AsFile 可能返回编码后的路径 (如 %E5%90%8C...)
    // 我们必须解码它，否则后续再次编码会导致双重编码 (%25...)
    let normalizedPath = decodeURI(savedPath).replace(/\\/g, '/');
    
    // 确保路径完整性 (相对路径补全)
    if (!normalizedPath.includes('/') && !normalizedPath.includes('UserUploads')) {
         normalizedPath = `UserUploads/${charName}/${normalizedPath}`;
    }

    console.log("[FayephoneSupport] 文件保存成功，路径:", normalizedPath);
    
    return { url: normalizedPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Refined) 已加载成功！");
