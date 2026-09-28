coomand used for checking load balancer request on servers
 autocannon -c 100 -d 10 http://localhost/


 used for restarting docker container after changing in code

docker compose down
docker compose up --build


we use gateway proxy to add different server to differet routes we make folder auth proudct etc and one gate way folder we call proxy there and add all running port in main gatefile 