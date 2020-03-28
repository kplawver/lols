# quARTantined

A hastily thought up idea for a virtual museum of art hastily produced while self-quarantining from COVID-19.

## Contributing art

See the [Share Your Art](https://quartantined.me/share/) page on the site for instructions on how to submit your art.  

## Contributing Code

If you'd like to help make the site prettier, more accessible, easier to use or other improvements, that would be swell!  I'm definitely accepting pull requests for non-invasive, non-advertising, non-evil kinds of things.

### Setup

* This thing is built on [Hugo](https://gohugo.io), so you'll need to install it. That's pretty easy.
* Once you've install hugo, you can see things by running `hugo serve -D` and then pointing your favorite browser to [ye olde localhost](http://localhost:1313)

## Cleanup

* I imagine the repo will get fairly large after a while, so you'll probably want to run `hugo --gc` every once in a while, *especially* if you're messing around with resizing images.
* We don't store the `public` or `resources` directories in git because they're generated, so the first time you run things, it might take a sec to resize all the images.  If you're done playing around, you can delete those two directories to clean up hard drive space.
