# analyze messages

## install

you need to have [node.js v16 or above](https://nodejs.org/en/) and [npm v8 or above](https://www.npmjs.com/package/npm)

to initialize the project download it and run

```
$ npm install
```

to build/transpile the project run

```
$ npm run build
```

to install the project run

```
$ npm install . -g
```

## commands

### init

the main function, collects the messages from all the sources, sorts them chronologically and puts them together
created files are the basis for most other commands

accepts four argument:
1. path to the discord message 7z file `<discordZip>`
1. path to directory with twitch logs `<twitchDir>`
1. path to txt file of irc logs `<ircTxt>` 
1. *optional* path to the outdir

accepts one option:
1. `-z, --zip` zip output directory

```
$ blictionary init <discordZip> <twitchDir> <ircTxt> [outDir]
```
