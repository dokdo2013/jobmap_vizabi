import * as utils from "base/utils";
import Hook from "models/hook";

/*!
 * VIZABI Color Model (hook)
 */

const defaultPalettes = {
  "_continuous": {
    "_default": "#ffb600",
    "0%": "#8c30e8", //"hsl(270, 80%, 55%)",
    "25%": "#30a3e8", //"hsl(202.5, 80%, 55%)",
    "50%": "#30e85e", //"hsl(135, 80%, 55%)",
    "75%": "#e2c75a", //"hsl(48, 70%, 62%)",
    "100%": "#e83030" //"hsl(0, 80%, 55%)"
  },
  "_discrete": {
    "_default": "#ffb600",
    "0": "#4cd843",
    "1": "#e83739",
    "2": "#ff7f00",
    "3": "#c027d4",
    "4": "#d66425",
    "5": "#0ab8d8",
    "6": "#bcfa83",
    "7": "#ff8684",
    "8": "#ffb04b",
    "9": "#f599f5",
    "10": "#f4f459",
    "11": "#7fb5ed"
  },
  "_default": {
    "_default": "#ffb600"
  }
};

const comparePossiblyArrays = function comparePossiblyArrays(a, b) {
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return d3.color(a).hex() == d3.color(b).hex();
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return utils.arrayEquals(a, b);
  }
  return false;
};

const ColorModel = Hook.extend({

  /**
   * Default values for this model
   */
  getClassDefaults() {
    const defaults = {
      use: null,
      which: null,
      scaleType: null,
      palette: {},
      domainMin: null,
      domainMax: null,
      clamp: true,
      paletteHiddenKeys: [],
      paletteLabels: null,
      allow: {
        scales: ["linear", "log", "genericLog", "time", "pow", "ordinal"]
      }
    };
    return utils.deepExtend(this._super(), defaults);
  },

  /**
   * Initializes the color hook
   * @param {Object} values The initial values of this model
   * @param parent A reference to the parent model
   * @param {Object} bind Initial events to bind
   */
  init(name, values, parent, bind) {
    const _this = this;
    this._type = "color";

    this._super(name, values, parent, bind);

    this._hasDefaultColor = false;

    this.on("hook_change", () => {
      if (_this._readyOnce || _this._loadCall) return;

      if (_this.palette && Object.keys(_this.palette._data).length !== 0 || _this.paletteHiddenKeys.length) {
        const defaultPalette = _this.getDefaultPalette();
        const currentPalette = _this.getPalette();
        const palette = {};
        const paletteHiddenKeys = _this.paletteHiddenKeys;
        //extend partial current palette with default palette and
        //switch current palette elements which equals
        //default palette elments to nonpersistent state
        Object.keys(defaultPalette).forEach(key => {
          if (!paletteHiddenKeys.includes(key) && (!currentPalette[key] || comparePossiblyArrays(defaultPalette[key], currentPalette[key]))) palette[key] = defaultPalette[key];
        });
        _this.set("palette", palette, false, false);
      }
    });
  },

  // args: {colorID, shadeID}
  getColorShade(args) {
    const palette = this.getPalette();

    if (!args) return utils.warn("getColorShade() is missing arguments");

    // if colorID is not given or not found in the palette, replace it with default color
    //if (!args.colorID || !palette[args.colorID]) args.colorID = "_default";

    // if the resolved colr value is not an array (has only one shade) -- return it
    if (!utils.isArray(palette[args.colorID])) return args.shadeID == "shade" ? d3.rgb(palette[args.colorID] || this.scale(args.colorID)).darker(0.5).toString() : palette[args.colorID];

    const conceptpropsColor = this.getConceptprops().color;
    const shade = args.shadeID && conceptpropsColor && conceptpropsColor.shades && conceptpropsColor.shades[args.shadeID] ? conceptpropsColor.shades[args.shadeID] : 0;

    return palette[args.colorID][shade];

  },

  /**
   * Get the above constants
   */
  isUserSelectable() {
    const conceptpropsColor = this.getConceptprops().color;
    return conceptpropsColor == null || conceptpropsColor.selectable == null || conceptpropsColor.selectable;
  },

  setWhich(newValue) {
    if (this.palette) {
      this.palette._data = {};
      this.set("paletteHiddenKeys", [], false, true);
    }
    this._super(newValue);
  },

  getColorlegendMarker() {
    if (!this.colorlegendMarker) this.colorlegendMarker = this.getClosestModel("marker_colorlegend");
    return this.colorlegendMarker;
  },

  /**
   * set color
   */
  setColor(value, pointer, oldPointer, persistent, force = false) {
    if (value) value = d3.color(value).hex();

    let range;
    const paletteObj = value && pointer ? { [pointer]: value } : {};

    if (this.isDiscrete()) {
      range = this.scale.range();
      range[this.scale.domain().indexOf(pointer)] = value;
    } else {
      const palette = this.getPalette();
      const paletteKeysOld = Object.keys(palette);
      const defaultPalette = this.getDefaultPalette();
      const paletteHiddenKeys = this.paletteHiddenKeys;

      if (oldPointer !== null) {
        if (defaultPalette[oldPointer] && !paletteHiddenKeys.includes(oldPointer)) {
          paletteHiddenKeys.push(oldPointer);
        }

        if (paletteKeysOld.includes(oldPointer)) {
          delete palette[oldPointer];
          delete this.palette[oldPointer];
          this.palette._data[oldPointer].off();
          delete this.palette._data[oldPointer];
        }

        //use _default for emit palette change
        if (!pointer) {
          persistent = this.palette["_default"] !== defaultPalette["_default"];
          force = true;
          paletteObj["_default"] = this.palette["_default"];
          this.set("paletteHiddenKeys", paletteHiddenKeys, true, true);
        }
      }

      if (pointer && paletteHiddenKeys.includes(pointer)) {
        paletteHiddenKeys.splice(paletteHiddenKeys.indexOf(pointer), 1);
      }

      if (pointer && !this.palette[pointer] && !oldPointer) {
        this.palette.set(pointer, null, false, false);
      }

      if (pointer && value) palette[pointer] = value;

      range = Object.keys(palette).sort((a, b) => a - b).map(key => palette[key]);

      if (paletteObj[pointer] && defaultPalette[pointer] && paletteObj[pointer] === defaultPalette[pointer]) {
        persistent = false;
      }

      if (!paletteKeysOld.includes(pointer) || oldPointer !== null) {
        //domain rebuild
        const { scale } = this._buildColorScale(this.scaleType, palette);
        this.scale.domain(scale.domain());
      }
    }
    this.scale.range(range);
    this.palette.set(paletteObj, force, persistent);
  },


  /**
   * maps the value to this hook's specifications
   * @param value Original value
   * @returns hooked value
   */
  mapValue(value) {
    //if the property value does not exist, supply the _default
    // otherwise the missing value would be added to the domain
    if (this.scale != null && this.isDiscrete() && this._hasDefaultColor && this.scale.domain().indexOf(value) == -1) value = "_default";
    return this._super(value);
  },


  getDefaultPalette() {
    const conceptpropsColor = this.getConceptprops().color;
    let palette;

    this.discreteDefaultPalette = false;

    if (conceptpropsColor && conceptpropsColor.palette) {
      //specific color palette from hook concept properties
      palette = utils.clone(conceptpropsColor.palette);
    } else if (defaultPalettes[this.which]) {
      //color palette for this.which exists in palette defaults
      palette = utils.clone(defaultPalettes[this.which]);
    } else if (this.use === "constant") {
      //an explicit hex color constant #abc or #adcdef is provided
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(this.which)) {
        palette = { "_default": this.which };
      } else {
        palette = utils.clone(defaultPalettes["_default"]);
      }
    } else {
      palette = utils.clone(defaultPalettes[this.isDiscrete() ? "_discrete" : "_continuous"]);
      this.discreteDefaultPalette = true;
    }

    return palette;
  },

  _getPaletteLabels() {
    const conceptpropsColor = this.getConceptprops().color;
    let paletteLabels = null;

    if (conceptpropsColor && conceptpropsColor.paletteLabels) {
      //specific color palette from hook concept properties
      paletteLabels = utils.clone(conceptpropsColor.paletteLabels);
    }
    return paletteLabels;
  },

  getPaletteLabels() {
    return this.paletteLabels.getPlainObject();
  },

  getPalette() {
    //rebuild palette if it's empty
    if ((!this.palette || Object.keys(this.palette._data).length === 0) && this.paletteHiddenKeys.length === 0) {
      const palette = this.getDefaultPalette();
      this.set("palette", palette, false, false);
      this.set("paletteHiddenKeys", [], false, true);
      const paletteLabels = this._getPaletteLabels();
      this.set("paletteLabels", paletteLabels, false, false);
    }
    const palette = this.palette.getPlainObject();

    if (this.scaleType !== "ordinal") {
      delete palette["_default"];
    }
    return palette;
  },

  /**
   * Gets the domain for this hook
   * @returns {Array} domain
   */
  buildScale(scaleType = this.scaleType) {
    const _this = this;

    const paletteObject = _this.getPalette();

    const { scaleType: newScaleType, scale } = this._buildColorScale(scaleType, paletteObject);

    this.scale = scale;
    this.scaleType = newScaleType;
  },

  _buildColorScale(scaleType, paletteObject) {
    const _this = this;
    let domain = Object.keys(paletteObject);
    let range = utils.values(paletteObject);
    let scale;

    this._hasDefaultColor = domain.indexOf("_default") > -1;

    if (scaleType == "time") {

      const timeMdl = this._space.time;
      const limits = timeMdl.splash ?
        { min: timeMdl.parse(timeMdl.startOrigin), max: timeMdl.parse(timeMdl.endOrigin) }
        :
        { min: timeMdl.start, max: timeMdl.end };

      if (!limits.min) limits.min = new Date();
      if (!limits.max) limits.max = new Date();

      const singlePoint = (limits.max - limits.min == 0);

      domain = domain.sort((a, b) => a - b);
      range = domain.map(m => singlePoint ? paletteObject[domain[0]] : paletteObject[m]);
      domain = domain.map(m => !m.includes("%") ? timeMdl.parse(m) : (limits.min.valueOf() + parseInt(m) / 100 * (limits.max.valueOf() - limits.min.valueOf())));

      scale = d3.scaleUtc()
        .domain(domain)
        .range(range)
        .interpolate(d3.interpolateRgb.gamma(2.2));

    } else if (!this.isDiscrete()) {

      const limitsObj = this.getLimits(this.which);
      //default domain is based on limits
      const limits = [
        (this.domainMin || this.domainMin === 0) ? this.domainMin : limitsObj.min,
        (this.domainMax || this.domainMax === 0) ? this.domainMax : limitsObj.max
      ];

      const singlePoint = (limits[1] - limits[0] == 0);

      domain = domain.sort((a, b) => a - b);
      range = domain.map(m => singlePoint ? paletteObject[domain[0]] : paletteObject[m]);
      domain = domain.map(m => !m.includes("%") ? m : (limits[0] + parseInt(m) / 100 * (limits[1] - limits[0])));

      if (d3.min(domain) <= 0 && d3.max(domain) >= 0 && scaleType === "log") scaleType = "genericLog";

      scale = d3[`scale${utils.capitalize(scaleType)}`]();

      if (scaleType === "genericLog") {
        scale.constant(limitsObj.minAbsNear0);
      }

      if (scaleType === "log" || scaleType === "genericLog") {
        const s = scale.copy()
          .domain(limits)
          .range(limits);
        domain = domain.map(d => s.invert(d));
      }

      scale.domain(domain)
        .range(range)
        .clamp(!!this.clamp)
        .interpolate(d3.interpolateRgb.gamma(2.2));

    } else {
      range = range.map(m => utils.isArray(m) ? m[0] : m);

      scaleType = "ordinal";

      if (this.discreteDefaultPalette) {
        const defaultPalette = utils.extend({}, defaultPalettes["_discrete"]);
        delete defaultPalette["_default"];
        const defaultPaletteKeys = Object.keys(defaultPalette);

        domain = [].concat(this.getUnique(this.which));
        range = domain.map((d, i) => paletteObject[d] || defaultPalette[defaultPaletteKeys[i % defaultPaletteKeys.length]]);
      }

      scale = d3[`scale${utils.capitalize(scaleType)}`]()
        .domain(domain)
        .range(range)
        .unknown(paletteObject["_default"]);
    }

    return { scale, scaleType };
  }

});

export default ColorModel;
