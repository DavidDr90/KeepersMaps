import { Component, OnInit, ViewChild } from '@angular/core';
import { HostListener } from "@angular/core"
import { JsonService } from '../services/json.service';
import { Marker, Subjects } from "../marker";
import { AgmMap, LatLngBounds } from '@agm/core';


//TODO: make a welcome windoew where the user enter the first args, like data and subjects
//      later on the user can change this arges

declare var require: any;

// For work efficeint with collection of data
// https://lodash.com/
// Load the full build.
var _ = require('lodash');


declare var google: any;
const DEFUALT_LATITUDE = 51.5074, DEFUALT_LONGITUDE = 0.1278;//London UK
const SMALL_ARRAY_CONST = 20;

@Component({
  selector: 'app-google-maps',
  templateUrl: './google-maps.component.html',
  styleUrls: ['./google-maps.component.css']
})
export class GoogleMapsComponent implements OnInit {

  @ViewChild('AgmMap') agmMap: AgmMap;

  //this array are use for display the markers on the map
  heavy: any;
  medium: any;
  easy: any;

  data: any;
  mapsZoom: any;
  mapBorders;

  //this hold all the date locally
  markersArray = {
    "heavy": [], "medium": [], "easy": []
  };
  leftover: any;

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
    // console.log("height: " + this.screenHeight);
    // console.log("width: " + this.screenWidth);
  }

  userCurrentLocation: any;
  markers = []//Promise<Marker[]>;// = [];
  // TODO: change the map css style to match the current screen size
  screenHeight;
  screenWidth;

  map: any;

  lat: number = DEFUALT_LATITUDE;
  lng: number = DEFUALT_LONGITUDE;

  constructor(private jsonService: JsonService) {
    console.log("constractor");
    this.onResize();
  }

  /** on component init
   * ask the user for prumssion to get his location
   * then send the location to the map
   * the map will center on the user location
   * if the user refuse use the center of the world.
   */
  ngOnInit() {
    if (window.navigator && window.navigator.geolocation) {
      window.navigator.geolocation.getCurrentPosition(
        position => {
          this.userCurrentLocation = position;
          this.setLocation(position);
        },
        error => {
          switch (error.code) {
            case 1:
              console.error('User Location: Permission Denied');
              break;
            case 2:
              console.error('User Location: Position Unavailable');
              break;
            case 3:
              console.error('User Location: Timeout');
              break;
          }
          this.userCurrentLocation = undefined;
          this.setLocation(this.userCurrentLocation);
        });
    }
  }

  /** init the map using the input location
   * initiate the map on the page
   * zoom is the display distance from the ground.
   * @param {the user current postion, if undefined use Defualt position} position 
   */
  setLocation(position) {
    var myLatLng;

    if (position != undefined) {
      myLatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
    } else {
      myLatLng = { lat: DEFUALT_LATITUDE, lng: DEFUALT_LONGITUDE };
    }
    this.userCurrentLocation = myLatLng;
    this.lat = myLatLng.lat;
    this.lng = myLatLng.lng;
  }

  /** ajust the size of the map depend on the device 
   * for mobile device like Android or iOS set the size to 100%
   * for browsers set by px
   */
  detectBrowser() {
    var useragent = navigator.userAgent;
    var mapdiv = document.getElementById("googleMap");

    if (useragent.indexOf('iPhone') != -1 || useragent.indexOf('Android') != -1) {
      console.info("iOS or Android Device")
      mapdiv.style.width = '100%';
      mapdiv.style.height = '100%';
    } else {
      console.info("Browser Device");
      mapdiv.style.width = '600px';
      mapdiv.style.height = '800px';
    }
  }

  //TODO: use the zoom number to decide how match markers to show on the map
  /** this function fire each time the user zoom in or zoom out in the map
   * @param e the zoom level, 0 to 22, 0 is the whole world
   */
  onZoomChange(e) {
    console.log("zoom!1");
    console.log(e);
    this.mapsZoom = e;
  }

  /** this function fire each time the currnet view is change
   *  using the lat and lng of the view we can change the markers array
   *  to display only the relevent marker to the currnet area in the world
   * @param event the bounds of the current map view
   */
  boundsChange(event) {

    //save the current map borders
    this.mapBorders = {
      "NorthEast":
      {
        "lat": event.getNorthEast().lat().toFixed(7),
        "lng": event.getNorthEast().lng().toFixed(7)
      },
      "SouthWest":
      {
        "lat": event.getSouthWest().lat().toFixed(7),
        "lng": event.getSouthWest().lng().toFixed(7)
      }
    };

    //TODO: fix the if
    // if (!_.valuesIn(this.mapBorders).some(x => { console.log(x); return ((x !== undefined) && (x != null)) })) {//make sure all the entries in mabBorders are full
    _.forOwn(this.markersArray, (value, key) => {
      // if ((value.length != 0) && (value !== null) && (value !== undefined)) {//check that the array has mrakers in it
      if (this.arrayNotEmpty(value)) {
        //filter out all the markers the not in the display rang
        this[key] = _.filter(value, (item) => {
          return (
            (item.longitude <= this.mapBorders.NorthEast.lng) && (item.longitude >= this.mapBorders.SouthWest.lng)
            &&
            (item.latitude <= this.mapBorders.NorthEast.lat) && (item.latitude >= this.mapBorders.SouthWest.lat)
          )
        })
      }
    });
    // }

  }

  //TODO: send the maps borders to the boundsChange() function to update the dispaly array
  mapReady(event) {
    console.log("map is ready!");
    console.log(event);
    console.log("data object in mapReady")
    console.log(this.jsonService.dataObject);
    console.time("remove dup")
    // let vale = this.jsonService.removeDup(this.jsonService.dataObject.heavy)
    console.log("vale")
    console.timeEnd("remove dup")

    console.time("save");
    this.saveMarkers();
    console.timeEnd("save")
    /*
    console.log(event.getBounds().getNorthEast().lat());
    const bounds: LatLngBounds = new google.maps.LatLngBounds();
    console.log(bounds.getNorthEast().lat());
    console.log(bounds.getSouthWest().lng());
    // console.log(google.maps.getBounds());

    console.log("in map ready:")
    console.log(this.jsonService.dataObject);
    this.saveDateLocally();
    // this.boundsChange();
    */
  }

  /** this function reduce the number of markers in the main array
   *  there for the google map can display the makrers easlly and quickly
   *  using the big number role asure us that the number of each subject will be in the right %
   * @param arr a large markers array
   * @returns smaller marker array, with a const length
   */
  private getOnlyFew(arr: any): any {
    let smallArr = [];
    for (let i = 0; i < SMALL_ARRAY_CONST; i++) {
      smallArr.push(
        arr[Math.floor(Math.random() * arr.length)]
      )
    }
    return smallArr;
  }


  /************************* WORKING FONCTIONS *******************/


  /** save the markers from the json service to local arrays
   *  use the fiter to save only the relevant arrays
   */
  saveMarkers(): any {
    _.forOwn(this.jsonService.filterObject.filterBy, (value, key) => {
      //remote the 'is' from 'isHeave'
      let newKey = (key.includes("is")) ? key.slice(2).toLowerCase() : key;
      //save to local arrays depending on the filter
      if ((value) && (this.arrayNotEmpty(this.jsonService.dataObject[newKey]))) {
        this.markersArray[newKey] = this.jsonService.dataObject[newKey].splice(0);
      }
    });
  }

  /** check if the imput array is not empty
   * @param array 
   * @returns true if the array is not empty false if the array is empty
   */
  arrayNotEmpty(array: any): boolean {
    if (!Array.isArray(array) || !array.length)
      // array does not exist, is not an array, or is empty
      return false;
    return true;
  }
}
