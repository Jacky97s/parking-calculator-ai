#!/bin/sh

# 在使用前請替換為您的新用戶名和郵箱
NEW_NAME="Jacky97s"
NEW_EMAIL="jacky.han.hong@gmail.com"

# 這將更改所有提交記錄
git filter-branch --force --env-filter '
    export GIT_AUTHOR_NAME="$NEW_NAME"
    export GIT_AUTHOR_EMAIL="$NEW_EMAIL"
    export GIT_COMMITTER_NAME="$NEW_NAME"
    export GIT_COMMITTER_EMAIL="$NEW_EMAIL"
' --tag-name-filter cat -- --branches --tags 