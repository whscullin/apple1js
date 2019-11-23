# apple1js

## What is this?

An Apple 1 emulator written in Javascript and HTML5

Things are still a little rough around the edges right now, hopefully I will have more time to clean things up.

First

```sh
npm install
```

To run a development server

```sh
npm run dev
```

Then open
[http://localhost:8080/apple1js.html](http://localhost:8080/apple1js.html)

To build a static distribution into `dist`

```sh
npm run build
```

## Requirements

### A Browser with HTML5 Support

The most recent versions of [Google Chrome](http://www.google.com/chrome/), [Safari](http://www.apple.com/safari/), [Firefox](http://www.firefox.com/), and [Opera](http://www.opera.com/) all seem to work reasonably well these days, although variations in HTML5 support pop up, and occasionally a major release will move things around out from under me. IEs prior to 9 lacks canvas tag support and are unsupported. [IE 9+](http://windows.microsoft.com/ie9) renders nicely on a modern machine.

### Basic Knowledge of the Apple 1

If you don't know how to use an Apple 1, this won't be much fun for you. A good place to start is the [Apple I Owners Club](http://applefritter.com/apple1).

## Known Limitations

### Limited Accuracy

Unlike the [Apple \]\[](../apple2js/) I wrote an emulator for, I don't own an Apple 1. My emulation is based on all the reference materials I was able to dig up, and by comparison to the behavior of other emulators.

## Acknowlegements

### I heavily referenced:

* [Apple I Owners Club](http://applefritter.com/apple1) and the [applefritter forums](http://applefritter.com/forum).

### And special thanks to:

*   [Mike](http://www.willegal.net/index.htm) for an eclectic collection of useful information. Someday I will work up the nerve to try building a replica.
*   And of course [Woz](http://www.woz.org), for launching my 30+ years of both silly and practical computer projects.

## Updates

### 2013-06-25

* ACI Emulation

    Programs are now loaded via ACI emulation off of virtual tapes. This is slower than just slamming them into memory, faster than emulated typing. Actually loading programs from audio files is on my radar, but quite a bit more work.

### 2013-06-05

* More Accurater

    I've scraped the Internet for more information. For instance [Cameron's Closet](http://cameronscloset.com/category/apple-1/) had some nice info on character display.

* Krusader off by default

    Krusader seems to cause some output weirdness outside of the Krusader shell, so I'm not using it by default anymore. Use #krusader to turn it back on.

### 2013-05-28

* Less Limited Input

    Pasting into the load window is now the same as typing. For now it is not any faster, though.

### 2013-05-27

* Krusader

    I've decided to use [Krusader](http://school.anhb.uwa.edu.au/personalpages/kwessen/apple1/Krusader.htm) as the default ROM for now. I'm just starting to find my way around it, but other Apple 1 people might find it useful.
