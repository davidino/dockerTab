### DockerTab

Docker containers in a Tab

![Screenshot.png](Screenshot.png)


### Connection to your docker

If you are using `boot2docker` you should already have access to your docker.

But if your docker is hosted somewhere else then you need to change the docker configuration in that way:

```sh
# /lib/systemd/system/docker.service
ExecStart=/usr/bin/docker -d -H tcp://0.0.0.0:2375 -H fd://
```

### Notes

* based on https://github.com/maxogden/monu
