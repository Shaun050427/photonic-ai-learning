# 光计算与光生成模型学习系统

第一阶段的可直接阅读的学习站点与可运行实验。站点入口为 `index.html`，内容覆盖复振幅、干涉、衍射、Fresnel / Fraunhofer、角谱传播、4f、相位掩膜、MZI、非线性、采样与十天练习。学习进度与私人笔记通过独立私有仓库同步。

## 阅读与实践

1. 打开站点首页，按照左侧知识地图和十天计划学习。
2. 在本机安装 Python 3.10+，执行 `python -m pip install -r requirements.txt`。
3. 执行 `python experiments/foundations.py --output results`，程序生成干涉、传播、相位掩膜、衍射与频域滤波图像。`results/` 已排除在版本库之外。
4. 执行 `python -m unittest discover -s tests` 检查角谱传播的基本数值性质。
5. 若安装了 Node.js，可执行 `node --test tests/test_progress_sync.cjs`，模拟两台设备的读取、提交与冲突保护。

实验代码采用标量、相干、单色光近似，FFT 对应有限的周期计算窗口。真实器件还涉及孔径、像差、偏振、噪声、损耗以及采样边界；不能把这份练习的输出直接当作实验器件预测。

## 发布

`.github/workflows/pages.yml` 在推送到 `main` 后，把仓库根目录发布为 GitHub Pages。创建仓库后，在 **Settings → Pages → Build and deployment** 将来源设为 **GitHub Actions**。首次发布可在仓库的 **Actions** 标签页查看结果。

此仓库只放公开教材和代码。私人笔记与学习进度位于 `Shaun050427/photonic-ai-learning-data` 的 `data/photonic-progress.json`；访问令牌不能提交到任何仓库。

## 首次连接私人进度

1. 在 GitHub 的 **Settings → Developer settings → Personal access tokens → Fine-grained tokens** 新建 Token。Repository access 选择 **Only select repositories**，仅勾选 `photonic-ai-learning-data`；Repository permissions 中设置 **Contents: Read and write**，其余保持最小权限。
2. 打开学习站点，进入 **学习进度与云同步 → 云同步设置**，把 Token 粘贴到输入框，点 **连接并同步**。Token 只保存在当前浏览器会话，关闭浏览器后需要重新填写。
3. 在另一台设备重复第二步。不同设备无需共享浏览器缓存；进度写入私有 GitHub 仓库，页面打开、重新获得焦点、每隔 30 秒以及编辑停止 3 秒后会检查同步。

本机无网络时仍保留进度；如果设备同时修改，页面暂停自动覆盖，并提供本机备份、采用云端和保留本机三种操作。版本历史中的恢复会新增提交，不删除旧提交。建议在第二台设备编辑前先确认状态为“已同步”。

## 目录

- `index.html`：原有中文学习手册，作为 Pages 首页。
- `progress-sync.js`：学习进度、笔记、冲突检测、版本历史及私有仓库读写。
- `experiments/foundations.py`：五个独立可运行的基础实验。
- `tests/test_foundations.py`：数值传播与相位掩膜检查。
- `tests/test_progress_sync.cjs`：同步和冲突保护检查。
- `.github/workflows/pages.yml`：静态站点部署。

后续阶段可以按 `02-d2nn/`、`03-generative/` 添加课程，再在首页导航中接入。
