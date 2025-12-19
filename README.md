# Canvas 躲避方块小游戏

一个纯原生 HTML/CSS/JS 的小型 HTML5 Canvas 游戏。控制蓝色方块躲避不断下落的障碍，存活越久得分越高，障碍也会越来越快。

## 快速开始

通用步骤（Windows / macOS / Linux 均适用）：

```bash
cd /path/to/repo
python -m http.server 8000
```

然后在浏览器打开 [http://localhost:8000](http://localhost:8000) 即可运行游戏。

> 若系统默认是 Python 2，可将命令改为 `python3 -m http.server 8000`。

## 游戏玩法

- 方向键或 `WASD` 控制蓝色方块移动。
- 点击“开始”或按空格开始游戏，支持暂停/继续、重开。
- 躲避红色障碍，分数随存活时间自动增加。
- 随时间推移，障碍的生成频率与下落速度都会提升。

## 文件结构

- `index.html`：页面结构与 Canvas 容器。
- `style.css`：页面布局与按钮等样式。
- `game.js`：游戏主循环、输入控制、难度调节与碰撞逻辑。
- `README.md`：运行与玩法说明（本文件）。

享受游戏，挑战更高分数！
