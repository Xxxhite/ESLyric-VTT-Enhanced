export function getConfig(cfg) {
    // 插件的基本配置信息
    cfg.name = "VTT Parser Enhanced";
    cfg.version = "0.2";
    cfg.author = "xianfish & Xxxhite";
    cfg.parsePlainText = true;
    cfg.fileType = "vtt";
}

export function parseLyric(context) {
    // 1. 调用 parser 函数将 VTT 文本解析为包含时间戳和文本的区块数组 (blocks)
    let blocks = parser(context.lyricText);
    context.lyricText = ''; // 清空原始文本准备重新写入

    const timeMap = {};
    const lrcList = [];

    // 2. 将解析好的区块转换为标准的 LRC 格式字符串
    for (const block of blocks) {
        // 拼接起始时间和歌词文本，例如: [00:01.650]歌词内容
        const text = '[' + formatTime(block.startTime) + ']' + block.text;

        // 如果上一个时间标签刚好等于当前文本的起始时间，则覆盖上一行，避免出现连续的空行或冗余
        if (timeMap[block.startTime]) {
            lrcList[lrcList.length - 1] = text;
        } else {
            lrcList.push(text);
        }

        // 写入当前文本的结束时间作为下一行的占位符（作为高亮结束的标记）
        lrcList.push('[' + formatTime(block.endTime) + ']');
        timeMap[block.endTime] = true; // 记录该时间点已被使用
    }

    // 3. 使用标准换行符将数组拼接为最终 ESLyric 可识别的 LRC 文本
    context.lyricText = lrcList.join("\r\n");
}

function parser(context) {
    // 内部函数：将字符串时间 (hh:mm:ss.mmm 或 mm:ss.mmm) 转换为毫秒数
    function toTimeStamp(timeStr) {
        if (!timeStr) return 0; // 防御性判断，防止传入 undefined 导致崩溃
        const time = timeStr.trim().split(":");
        let h = 0, m = 0, sStr = "";

        // 兼容包含小时和不包含小时的两种时间格式
        if (time.length === 3) { // 格式: hh:mm:ss.mmm
            h = parseInt(time[0]) * 3600000;
            m = parseInt(time[1]) * 60000;
            sStr = time[2];
        } else if (time.length === 2) { // 格式: mm:ss.mmm
            m = parseInt(time[0]) * 60000;
            sStr = time[1];
        } else {
            return 0; // 格式完全不符则返回 0
        }

        // 分离秒和毫秒
        let [second, mill] = sStr.split(".");
        let s = parseInt(second) * 1000;
        let ms = parseInt(mill) || 0; // 若无毫秒部分则默认为 0
        return h + m + s + ms;
    }

    let blocks = [];

    // 【核心修复 1 - 换行符兼容】：将所有的 Windows 换行符 (\r\n) 统一替换为 (\n)
    let text = context.replace(/\r\n/g, '\n');

    // 使用正则按两个或更多连续换行符切割，将整篇文本分割为独立的区块结构
    let rawBlocks = text.split(/\n{2,}/);

    for (const rawBlock of rawBlocks) {
        // 按行切割区块，去除每行首尾空格，并过滤掉完全空白的行
        const lines = rawBlock.split('\n').map(str => str.trim()).filter(str => str !== '');

        // 过滤掉无效区块：空区块、VTT 文件头(WEBVTT)、VTT 规范中的注释(NOTE)和样式(STYLE)
        if (lines.length === 0 || lines[0].includes("WEBVTT") || lines[0].startsWith("NOTE") || lines[0].startsWith("STYLE")) continue;

        // 【核心修复 2 - 动态定位】：动态寻找包含时间轴连接符 '-->' 的行，忽略上方的数字序号
        let timeLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('-->')) {
                timeLineIndex = i;
                break;
            }
        }

        // 如果这个区块里找不到时间轴，直接跳过
        if (timeLineIndex === -1) continue;

        // 提取出时间轴所在行，并分割起始与结束时间
        let timeLine = lines[timeLineIndex];
        let [startRaw, endRaw] = timeLine.split('-->').map(str => str.trim());

        // 【核心修复 3 - 剔除冗余参数】：只截取纯时间部分，丢弃 VTT 时间轴特有的附加定位参数 (如 align:start)
        // 举例: "00:00:20.400 align:middle" 按空格切割后只提取第一部分 "00:00:20.400"
        let start = startRaw.split(/\s+/)[0];
        let end = endRaw.split(/\s+/)[0];

        // 【核心修复 4 - 内联标签清洗】：提取时间轴之后的所有行组合成歌词文本
        // 并使用正则表达式 /<[^>]+>/g 清除所有类似 <b>, <v Speaker> 的富文本标签，防止显示为乱码
        let lyricText = lines.slice(timeLineIndex + 1).join(' ').replace(/<[^>]+>/g, '');

        // 组装最终的区块对象并推入 blocks 数组
        const startTime = toTimeStamp(start);
        const endTime = toTimeStamp(end);
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) continue;
        blocks.push({
            startTime: startTime,
            endTime: endTime,
             ext: lyricText.trim()
        });
    }
    return blocks;
}

// 内部函数：为个位数前补零 (例如将 5 变成 "05")
function zpad(n) {
    var s = n.toString();
    return (s.length < 2) ? "0" + s : s;
}

// 内部函数：将毫秒数格式化为 LRC 规范的 [mm:ss.xx] 时间戳字符串
function formatTime(time) {
    var t = Math.abs(time / 1000);          // 转换为秒
    var m = Math.floor(t / 60);             // 提取分钟数
    t -= m * 60;                            // 剩余的秒数（带小数）
    var s = Math.floor(t);                  // 提取整数秒数
    var ms = t - s;                         // 提取毫秒小数部分
    // 拼接字符串: mm:ss.xx (毫秒保留两位)
    var str = zpad(m) + ":" + zpad(s) + "." + zpad(Math.floor(ms * 100));
    return str;
}
