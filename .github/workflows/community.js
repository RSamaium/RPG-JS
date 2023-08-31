import { gitToJs } from 'git-parse';
import axios from 'axios';

let firstVersionIgnore = true;
let versionFound = ''
const botToken = process.env.COMMUNITY_BOT_TOKEN;

if (!botToken) {
    console.error("No bot token found");
    process.exit(1);
}

async function extractLinksFromCommits(repoPath) {
    const commits = await gitToJs(repoPath);

    for (let commit of commits) {
        const message = commit.message;

        const versionRegex = /v\d+\.\d+\.\d+(-[a-z]+(\.\d+)?)?/;
        const version = versionRegex.exec(message)
        
        if (version) {
            if (firstVersionIgnore) {
                versionFound = version[0]
                continue
            }
            else {
                break
            }
        }

        firstVersionIgnore = false

        const communityRegex = /#community-(\d+)/g;
        const match = communityRegex.exec(message);

        if (match) {
            const id = match[1];
            console.log("Found community link:", id, versionFound)
            await sendPostToCommunity(id, {
                version: versionFound
            });
        }
    }
}

async function sendPostToCommunity(id, { version }) {
    try {
        const response = await axios.post("https://community.rpgjs.dev/api/posts", {
            data: {
                type: "posts",
                attributes: {
                    content: `Hello,

The problem has been solved on the latest version (${version}). [You can update RPGJS](https://docs.rpgjs.dev/guide/upgrade.html)`
                },
                relationships: {
                    discussion: {
                        data: {
                            type: "discussions",
                            id
                        }
                    }
                }
            }
        }, {
            headers: {
                "Authorization": "Token " + botToken,
                "Content-Type": "application/vnd.api+json",
            }
        });
        console.log("Post sent to community", response.data.id)
        console.log(response.data);
    } catch (error) {
        console.error("Error sending post to community:", error);
    }
}

extractLinksFromCommits(process.cwd());
