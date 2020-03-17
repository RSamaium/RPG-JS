#!/bin/bash
source /home/ec2-user/.bash_profile
mkdir -p /var/games/tinygames

# arg 1: game name
# arg 2: CDN name
run-game () {
    cd /var/games/tinygames/$1
    npm install

    # upload static files to s3
    cd /var/games/tinygames/$1/dist && aws s3 sync --acl public-read --delete . s3://$1.lance.gg

     # invalidate CDN
    aws configure set preview.cloudfront true && aws cloudfront create-invalidation --distribution-id $2 --paths "/*"
}

run-game asteroids ESBEDKJR2DSZF
run-game wiggle E2EWSSN9O8YLLP
run-game brawler E3T8BVLDOS80MN
