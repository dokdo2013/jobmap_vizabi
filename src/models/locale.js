import * as utils from 'base/utils';
import DataConnected from 'models/dataconnected';

// this and many other locale information should at some point be stored in an external file with locale information (rtl, date formats etc)
var rtlLocales = ['ar', 'ar-SA'];

var LocaleModel = DataConnected.extend({

  /**
   * Default values for this model
   */
  _defaults: {
    id: "en",
    filePath: ""
  },

  dataConnectedChildren: ["id"],
  strings: {},

  /**
   * Initializes the locale model.
   * @param {Object} values The initial values of this model
   * @param parent A reference to the parent model
   * @param {Object} bind Initial events to bind
   */
  init: function(name, values, parent, bind) {
    this._type = "locale";

    //same constructor, with same arguments
    this._super(name, values, parent, bind);
  },

  _isLoading: function() {
    return (!this._loadedOnce || this._loadCall);
  },

  loadData: function() {

    var _this = this;
    this.setReady(false);
    this._loadCall = true;

    var conceptPropsPromise = this.getClosestModel('data').loadConceptProps();
    var filePromise = new Promise((resolve, reject) => {
      d3.json(this.filePath + _this.id + ".json", (error, strings) => {
        if (error) reject(error);
        this.handleNewStrings(strings)
        resolve();
      });
    });

    return Promise.all([filePromise, conceptPropsPromise])
      .then(() => this.trigger('translate'));
  },

  handleNewStrings: function(receivedStrings) {
    this.strings[this.id] = this.strings[this.id]
      ? utils.extend(this.strings[this.id], receivedStrings)
      : receivedStrings;
  },

  /**
   * Gets a certain UI string
   * @param {String} id string identifier
   * @returns {string} translated string
   */
  getUIString: function(stringId) {
    if(this.strings && this.strings[this.id] && (this.strings[this.id][stringId] || this.strings[this.id][stringId]==="")) {
      return this.strings[this.id][stringId];
    } else {
      if(!this.strings || !this.strings[this.id]) utils.warn("Strings are not loaded for the " + this.id + " locale. Check if translation JSON is valid");
      return stringId;
    }
  },

  /**
   * Gets the translation function
   * @returns {string} translation function
   */
  getTFunction: function() {
    var _this = this;
    return function(stringId) {
      return _this.getUIString(stringId);
    }
  },

  isRTL: function() {
    return (rtlLocales.indexOf(this.id) !== -1);
  }

});

export default LocaleModel;