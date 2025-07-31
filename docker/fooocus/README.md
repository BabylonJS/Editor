# Build container

```bash
docker build -t fooocus .
```

# Run container

```bash
docker run -i -t --gpus all -p 7865:7865 -v ./models:/fooocus/models -v ./outputs:/fooocus/outputs --name fooocus-container fooocus
```

# Connect to container

```bash
docker start -ai fooocus-container
```
