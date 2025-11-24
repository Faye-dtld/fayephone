
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

    // 3. 获取当前上下文和角色信息 (模仿参考代码逻辑)
    // 这种方式比直接取 context.name 更稳健，能确保存入正确的角色文件夹
    const context = getContext();
    let charName = "UserUploads";

    try {
        // 尝试获取当前聊天的角色名
        if (context.characterId !== undefined && context.characters) {
            const charId = context.characterId;
            // 确保 characters 是数组或对象
            const characters = context.characters;
            if (characters[charId] && characters[charId].name) {
                charName = characters[charId].name;
            }
        } else if (context.name) {
            // 回退方案
            charName = context.name;
        }
    } catch (e) {
        console.warn("[FayephoneSupport] 获取角色信息失败，将使用默认文件夹", e);
        charName = "UserUploads";
    }

    // 净化角色名，防止路径错误
    charName = charName.replace(/[\\/:*?"<>|]/g, "");

    // 4. 生成文件名 (时间戳 + 哈希)
    const fileName = `${Date.now()}_${getStringHash(file.name)}`;

    console.log(`[FayephoneSupport] 保存目标: Character=${charName}, File=${fileName}.${ext}`);

    // 5. 调用酒馆内部函数保存文件
    // 这会将文件保存到 public/UserUploads/{charName}/{fileName}.{ext}
    const savedPath = await saveBase64AsFile(
        base64Data,
        charName,
        fileName,
        ext
    );

    // 6. 路径标准化
    // 确保返回的是相对路径 (UserUploads/...) 并且使用正斜杠
    let normalizedPath = savedPath.replace(/\\/g, '/');
    
    // 某些版本的 ST saveBase64AsFile 可能只返回文件名，这里做个保险
    if (!normalizedPath.includes('/') && !normalizedPath.includes('UserUploads')) {
         normalizedPath = `UserUploads/${charName}/${normalizedPath}`;
    }

    console.log("[FayephoneSupport] 文件保存成功，路径:", normalizedPath);
    
    return { url: normalizedPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Refined) 已加载成功！");
