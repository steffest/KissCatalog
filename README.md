# Kiss-Catalog

Insanely simple Catalog System to keep track of your collections

Kiss-catalog is a file-based catalog system.  
You structure your catalog in nested folders and files.  
Kiss-Catalog transforms it into a searchable, browsable, web-ready catalog

There's a small demo collection at http://www.stef.be/collector/amiga/ (read only mode)


![KISS-Catalog List](./docs/_img/screen1.png?raw=true)

![KISS-Catalog Detail](./docs/_img/screen2.png?raw=true)

### History
This project was born of a personal need.
My retro computer collection was growing up to a point where I didn't know exactly what I had anymore, or where I had put it.
Questions like "I know I have this accelerator card, but ... where the heck is it?" needed answers.
The difference between a collector and a hoarder is that the former knows what he has and keeps everything in good shape.  
There's a ton of software already out there to help with that but I wanted something super-super-simple.
As experience taught me: If it's too hard to maintain, it won't be.

### Goals
 - simple simple simple to maintain
 - sustainable - this means:
   - no exotic or platform dependent file formats: even 2 decades from know, every data you entered should still be accessible
   - no external (web)platforms: it's the only way to make sure your data is still there in a few years time.
   - no code dependencies. again: it's the only way to make sure your system still runs in a few years time.
   - platform independent. everything should be maintainable from whatever device you use. In my case this also means super old systems like the Commodore Amiga.
 - web enabled: everything should be easily accessible online if you want.
 - everything should be searchable/browsable to quickly locate an item or to quickly show some overviews
 
 
### Concept
To reach these goals everything is file based. no database, no excell-sheets, no fancy stuff.    
You structure you collection in folders. Each folder can contain files and subfolders that further describe your item.
Info is stored in plain text files. Images are stored in .jpg or .png. Any other file you add is just regarded as "file".  

Then, a script is run that pulls all these files into data-structure.
This .json file is used to display a webinterface with browse and search features.  
When you edit/add content from the webinterface, the local files are changed.  
The "database" is always being generated from the local files. 
This means your data is your data: it lives in your folder as plain text files, completely outside Kiss-catalog.  
If you stop using Kiss-catalog and delete it from your system, your hard cataloguing-work is not lost.   

The main info file is called "info.txt"  
The main image of an item is called "main.jpg"

If you want to display your collection on the web, simply put all your static files on a webhost.  
No database or serverside processing needed.   

Personally, I've put my collection files in Dropbox so they are available on all my machines.


### Setup
Kiss-Catalog runs on Node.  
Go to the folder you downloaded Kiss-catalog and run  
``node main.js``  

It will open a browser where you can configure it for first use.  
  
If you don't want to fiddle with node, you can also download the [pre-build binaries](./bin) for OSX, Windows or Linux.
These binaries are packaged with [PKG](https://github.com/zeit/pkg)  
If you want to package them yourself you need to install pkg
``npm install -g pkg``  
and then run  
``pkg package.json node6``  
in the Kiss-Catalog folder to build your binary


### Deploy to web.
Put your collection files somehere on the web so they are accessible.  
Enter this url (of your collection files) in the Kiss-Catalog config screen in the "root url" box.  
Put the "client" folder of Kiss-Catalog on your webhost.  
If you run from the packaged binary then copy the "client" folder (located in the same location as your binary)  there too.  
Your collection is now at http://your.web.host/client  (in read only mode)  
Of course you can rename the "client" folder to whatever you want.  


### Future plans
 - Make all text files editable from the web interface  
 - Add some authentication so you can also put the server online and manage everything from there  
 - Make the webinterface compatible with ancient browsers (Amiga)
 - add some image editing tools in the webinterface to quickly rotate,resize and crop images.
 - maybe I'll package everything more neatly using Electron or something, but honestly ... you should just install Node and run it from source :-)
 - Feature requests are welcome!









 


