# analyze messages

## install

you need to have [node.js v16 or above](https://nodejs.org/en/) and [npm v8 or above](https://www.npmjs.com/package/npm)

```
$ npm install https://github.com/m4rch3n1ng/blictionary-cli/tarball/main -g
```

## build

you need to have [node.js v16 or above](https://nodejs.org/en/) and [npm v8 or above](https://www.npmjs.com/package/npm)

to initialize the project download it and run

```
$ npm install
```

to build/transpile the project run

```
$ npm run build
```

to install it from the local build run

```
$ npm install . -g
```

## commands

### init

the main function, collects the messages from all the sources, sorts them chronologically and puts them together
created files are the basis for most other commands

accepts three input arguments and one output:
1. *[input]* path to the directory of discord channel entries `discordPath`
1. *[input]* path to the directory of twitch logs `twitchPath`
1. *[input]* path to the txt file of irc logs `ircPath`
1. *[output]* path to the output directory `outDir`

all inputs can either be given directly or in the zip format of either `.7z` or `.zip`
(***note**: if you zip a directory, you have to zip the directory directly instead of the entries (i.e. there can only be one file/dir at the highest level of the zip)*)  
*you have to give at least one `input`. the `output` is optional and defaults to `"."`*

these can either be given sequentially in the format

```
$ blictionary init [discord] [twitch] [ircTxt] [outDir]
```

or as options
1. `-d, --discord`, `discordPath`
1. `-t, --twitch`, `twitchPath`
1. `-i, --irc`, `ircPath`
1. `-o, --outDir`, `outDir`

```
$ blictionary init -d [discord] -t [twitch] -i [ircTxt] -o [outDir]
```

you can also specify multiple inputs of the same type by using the same flag twice

```
$ blictionary init -d [discord1] -d [discord2]
```

accepts one extra option:
1. `-z, --zip` zip the output directory

### corpus

accepts one argument: the path to the init directory <initDir>

```
$ blictionary corpus <initDir>
```

### entry search

search for an entry in a directory. [learn more about entries](https://github.com/m4rch3n1ng/blictionary#entries).  
accepts one argument: the path to the directory <dir>

```
$ blictionary entry search <dir>
```
