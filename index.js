
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

// 核心上传函数 - 学习自 Olivia-s-Toolkit
// 逻辑：直接利用酒馆的上下文和原生保存函数，确保路径符合 AI 读取标准
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

    // 3. 获取角色信息 (使用 window.SillyTavern 以获得最准确的上下文)
    let charName = "UserUploads";
    try {
        // 优先使用全局对象获取，这是最稳妥的方式
        if (window.SillyTavern && window.SillyTavern.getContext) {
            const context = window.SillyTavern.getContext();
            if (context.characterId !== undefined) {
                // 等待 characters promise 解析 (如果有) 或直接读取
                const characters = context.characters; 
                // 注意：在不同版本 ST 中 characters 可能是数组或 Promise，这里做个简单兼容
                let charData = null;
                if (Array.isArray(characters)) {
                    charData = characters[context.characterId];
                } else if (typeof characters === 'object') {
                     // 某些旧版本直接是对象
                     charData = characters[context.characterId];
                }
                
                if (charData && charData.name) {
                    charName = charData.name;
                }
            }
        }
    } catch (e) {
        console.warn("[FayephoneSupport] 获取全局上下文失败，尝试使用默认路径", e);
    }

    // 4. 生成文件名
    const fileName = `${Date.now()}_${getStringHash(file.name)}`;

    console.log(`[FayephoneSupport] 保存目标: Character=${charName}, File=${fileName}.${ext}`);

    // 5. 调用酒馆内部函数保存文件
    // saveBase64AsFile 会自动处理路径，返回的一般是相对路径 (例如 "UserUploads/CharName/file.png")
    const savedPath = await saveBase64AsFile(
        base64Data,
        charName,
        fileName,
        ext
    );

    // 6. 直接返回结果
    // Olivia-s-Toolkit 的逻辑是直接信任这个返回值。
    // 如果返回的路径包含 URI 编码 (如 %20)，我们解码它以便在 HTML src 中显示更友好，
    // 但通常 img src 能处理编码。为了保险，解码并替换反斜杠。
    const normalizedPath = decodeURI(savedPath).replace(/\\/g, '/');

    console.log("[FayephoneSupport] 文件保存成功，路径:", normalizedPath);
    
    return { url: normalizedPath };
}

// 挂载到 window，供 iframe 调用
window.__fayePhoneSupport_upload = adapterUpload;

console.log("FayephoneSupport (Vision Fixed) 已加载成功！");
