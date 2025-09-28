# iptv-recorder
#### Build docker image:
```bash
docker build -t iptv-recorder:local -f docker/Dockerfile .
```

#### Run app:
```bash
docker run -it -p "3000:3000" -e TZ=Europe/Istanbul -v ./data:/data -v ./src/contants-example.js:/app/src/contants.js iptv-recorder:local
```
