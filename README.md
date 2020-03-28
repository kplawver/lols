# LOLs

A Saturday morning project while social distancing during COVID-19 to turn my stupid collection of memes collected over the last decade+ into a garbage website where you can see them, browse by tags, and send them to various social things and have them show up correctly as a preview.

It's... not done.

Since this is just a toy, it's completely open source, so feel free to grab it, delete everything under `posts` and go to town creating your own stupid thing.

[Here's the live site](https://lols.lawver.net) if you'd like to see the not-finished product.

## Contributing Code

If you'd like to help make the site prettier, more accessible, easier to use or other improvements, that would be swell!  I'm definitely accepting pull requests for non-invasive, non-advertising, non-evil kinds of things.

## Setup

* This thing is built on [Hugo](https://gohugo.io), so you'll need to install it. That's pretty easy.
* Once you've install hugo, you can see things by running `hugo serve -D` and then pointing your favorite browser to [ye olde localhost](http://localhost:1313)

### Importing Images

If you already have a directory full of images, and have ruby installed, I wrote a thing that will turn a directory (even if it has a million sub-directories) into posts:  

* Open up `scripts/import.rb`
* Change the `ENV['IMPORT_PATH']` value to the directory on your computer that holds your treasured images.
* From the main lols directory, run `ruby scripts/import.rb` and wait.
* Now your posts directory should be absolutely _stuffed_ with stuff!

## Cleanup

* I imagine the repo will get fairly large after a while, so you'll probably want to run `hugo --gc` every once in a while, *especially* if you're messing around with resizing images.
* We don't store the `public` or `resources` directories in git because they're generated, so the first time you run things, it might take a sec to resize all the images.  If you're done playing around, you can delete those two directories to clean up hard drive space.
