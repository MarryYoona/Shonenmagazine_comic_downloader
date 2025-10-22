# Shonenmagazine\_comic\_downloader

A user script for downloading comic chapters from `https://pocket.shonenmagazine.com/`, supporting image extraction, cropping settings, order restoration, and batch download functions.

## Features

*   Automatically extract comic images from the current chapter
*   Custom image cropping parameters (width/height)
*   Support image order restoration (requires seed parameter)
*   Single/batch image download
*   Image preview and thumbnail display

## Installation

1.  Install a user script manager in your browser (e.g., Tampermonkey)
2.  Import this script into the manager
3.  Enable the script

## Usage

1.  Visit the target comic chapter page (`https://pocket.shonenmagazine.com/title/*/episode/*`)
2.  After the page loads, an operation panel will appear on the right
3.  Click "Extract Images" to get chapter images
4.  (Optional) Set cropping parameters and confirm
5.  (Optional) Enter seed parameter to restore image order
6.  Click the "Download" button to save images (single or batch)

## Notes

*   For personal study and research only; do not infringe on copyrights
*   Website updates may cause the script to fail
*   Cropping parameter defaults are based on the first image's resolution; adjust according to actual conditions
