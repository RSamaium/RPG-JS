#!/bin/bash
source /home/ec2-user/.bash_profile
cd /var/games/tinygames

# arg 1: game name
# arg 2: port name
run-game () {
    pgrep node | xargs pwdx | grep $1 |awk '{print $1}' | sed s/://g > /tmp/killpid
    kill -9 `cat /tmp/killpid` || true
    cd /var/games/tinygames/$1
    PORT=$2 npm start >$1.out 2>$1.err &
}

run-game asteroids 3002
run-game wiggle 3004
run-game brawler 3006
