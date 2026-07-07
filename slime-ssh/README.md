# 🐳 slime-ssh — slime-docker，从"角色扮演"升级为真容器

以前的 slime-docker 是 curl 穿戏服：访客粘贴 `slime()` wrapper，每条命令是一次
one-shot GET。**现在它是一个真正的 SSH 服务器**：一条 `ssh` 命令进来，
`/hi` 打字秀自动播完，访客直接落在容器内的活提示符上——不需要 wrapper、
不需要前缀，直接敲 `ls` / `sudo rm -rf /` / `vim`。

所有命令响应从 `wall-worker/src/index.js` 的 `shShow()` **逐字节搬运**
（含 shClean 终端劫持过滤、120 条打盹上限文案、访客计数器语义）。
改这里的文案请同步改 Worker,反之亦然。

## 本地运行

```sh
docker build -t slime-ssh .
docker run -d --name slime-ssh --restart unless-stopped \
  -p 2222:2222 -v slime-ssh-data:/data slime-ssh

# 体验（任意用户名，无密码）：
ssh -p 2222 slime@localhost
```

host key 在首次启动时铸造进 `/data` 卷——重建镜像不换 key，回头客不会看到
MITM 警告。访客计数器也在卷里（`/data/state.json`）。

## 测试

```sh
npm install
node test/drive.js 2222    # 25 项断言：交互全命令 + exec one-shot
```

## 行为要点

- **进门零摩擦**：任意用户名、任意认证方式（包括 none）直接放行——整个容器就是欢迎垫
- **动画即入场**：连接 = 播放打字秀（片尾改为"你已经在容器里了"），⏎ / ^C 快进
- **交互 shell**：真提示符 `slime-docker ♡`、退格、^C 中断长动画、^D 退出、
  转义序列吞掉（方向键/粘贴标记不会弄脏输入）
- **`open "$(echo … | base64 -d)"`**：远程 shell 物理上摸不到访客的浏览器
  （这正是安全承诺本身），所以它演一段"伸手够不着"，然后递出预解码、
  OSC 8 可点击的门址
- **one-shot 模式**：`ssh -p 2222 host whoami` 行为等同旧的 `/sh?c=whoami`
- **防滥用**：全局 50 连接、每 IP 6 连接、每会话 120 条命令（同款打盹文案）、
  5 分钟空闲收摊、30 分钟硬上限、行长 1000 截断、命令 200 字符截断（>160 睡着）
- **纵深**：容器内无 shell 可逃（纯 node 进程、非 root 的 node 用户运行、
  每条响应都是字符串，从不 spawn 任何进程）；SFTP/端口转发一律拒绝

## 公网发布（尚未进行——需要你拍板）

本机 Mac 在 NAT 后面，公网访客现在还连不进来。三条路：

1. **小 VPS（推荐）**：每月几美元，`docker run` 同一个镜像，稳定 IP + 24/7 在线，
   不暴露家庭网络。把 22 端口直接给它，访客命令最短。
2. **家庭路由器端口转发 + DDNS**：零成本，但暴露家庭 IP、Mac 必须常开不睡眠，
   且住宅 IP 会变。不推荐对全网陌生人开这个口。
3. **Cloudflare Tunnel**：对普通 `ssh` 客户端无效（访客侧需要装 cloudflared），
   与"零门槛神秘指令"的气质相悖。不适用。

**公网通了之后**再改 Worker `/hi` 与静态 `hi` 的片尾：把 `slime()` wrapper 教学
换成一条 base64 包装的 `ssh` 神秘指令。在那之前线上文案保持原样
（否则访客会拿到一个连不上的地址）。Worker 的 `/sh` 路由可以保留作为
无法用 ssh 的访客（公司防火墙等）的降级通道。
