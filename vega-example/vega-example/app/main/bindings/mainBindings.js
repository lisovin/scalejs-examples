/*global define */
/*jslint sloppy: true*/
define({
    'sun-text': function () {
        return {
            vega: {
                vegaSpec: {
                    "name": "sunburst",
                    "width": 960,
                    "height": 700,
                    "padding": 2.5,
                    "data": [
                      {
                          "name": "tree",
                          "values": this.flare,
                          "format": { "type": "treejson" },
                          "transform": [
                            { "type": "sunburst", "value": "data.size" }
                          ]
                      },
                      {
                          "name": "alt",
                          "values": this.halfFlare,
                          "format": { "type": "treejson" },
                          "transform": [
                            { "type": "sunburst", "value": "data.size" }
                          ]
                      }
                    ],
                    "scales": [
                      {
                          "name": "color",
                          "type": "ordinal",
                          "range": [
                            "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#e6550d",
                            "#fd8d3c", "#fdae6b", "#fdd0a2", "#31a354", "#74c476",
                            "#a1d99b", "#c7e9c0", "#756bb1", "#9e9ac8", "#bcbddc",
                            "#dadaeb", "#636363", "#969696", "#bdbdbd", "#d9d9d9"
                          ]
                      },
                      {
                          "name": "size",
                          "type": "ordinal",
                          "domain": [0, 1, 2, 3, 4],
                          "range": [256, 28, 20, 14, 6]
                      },
                      {
                          "name": "opacity",
                          "type": "ordinal",
                          "domain": [0, 1, 2, 3],
                          "range": [0.15, 0.5, 0.8, 1.0]
                      },
                      {
                          "name": "r",
                          "type": "sqrt",
                          "domain": { "data": "table", "field": "data.size" },
                          "range": [20, 100]
                      }
                    ],
                    "marks": [
                      {
                          "type": "arc",
                          "from": {
                              "data": "tree"
                          },
                          "interactive": false,
                          "properties": {
                              "enter": {
                                  "x": { "group": "width", "mult": 0.5 },
                                  "y": { "group": "height", "mult": 0.5 },
                                  "innerRadius": { "field": "innerRadius" },
                                  "startAngle": { "field": "startAngle" },
                                  "outerRadius": { "field": "outerRadius" },
                                  "endAngle": { "field": "endAngle" },
                                  "fill": { "scale": "color", "field": "data.name" },
                                  "stroke": { "value": "#fff" }
                              },
                              "exit": {
                                  "fill": { "scale": "color", "field": "data.name" }
                              },
                              "hover": {
                                  "fill": { "value": "red" }
                              }
                          }
                      },/*
                      {
                          "type": "arc",
                          "from": {
                              "data": "tree"
                          },
                          "properties": {
                              "enter": {
                                  "x": { "group": "width", "mult": 0.5 },
                                  "y": { "group": "height", "mult": 0.5 },
                                  "innerRadius": { "field": "innerRadius" },
                                  "startAngle": { "field": "startAngle" },
                                  "outerRadius": { "field": "outerRadius" },
                                  "endAngle": { "field": "endAngle" },
                                  "stroke": { "value": "#fff" }
                              },
                              "update": {
                                  "fill": { "value": "rgba(0,0,0,0)" }
                              },
                              "hover": {
                                  "fill": { "value": "red" }
                              }
                          }
                      },*/
                      {
                          "type": "text",
                          "from": {
                              "data": "tree",
                              "transform": [{ "type": "filter","test": "(d.data.name.length < 12) && ((d.endAngle - d.startAngle) > 0.045)" }]
                          },
                          "interactive": false,
                          "properties": {
                              "enter": {
                                  "x": { "group": "width", "mult": 0.5 },
                                  "y": { "group": "height", "mult": 0.5 },
                                  "theta": { "field": "midAngle" },
                                  "angle": { "field": "textAngle"},
                                  "radius": { "field": "innerRadius" },
                                  "font": { "value": "Times New Roman" },
                                  "fontSize": { "value": "14" },
                                  "align": { "field": "textAlign" },
                                  "baseline": { "value": "middle" },
                                  "fill": { "value": "#000" },
                                  "text": { "field": "data.name" }
                              },
                              "update": {
                                  "fill": { "value": "#000" }
                              },
                              "hover": {
                                  "fill": { "value": "#000" }
                              }
                          }
                      }
                    ]
                }
            }
        }
    },
    'sun': function () {
        return {
            vega: {
                vegaSpec: {
                    "name": "sunburst",
                    "width": 960,
                    "height": 700,
                    "padding": 2.5,
                    "data": [
                      {
                          "name": "tree",
                          "values": this.flare,
                          "format": { "type": "treejson" },
                          "transform": [
                            { "type": "sunburst", "value": "data.size" }
                          ]
                      },
                      {
                          "name": "alt",
                          "values": this.halfFlare,
                          "format": { "type": "treejson" },
                          "transform": [
                            { "type": "sunburst", "value": "data.size" }
                          ]
                      }
                    ],
                    "scales": [
                      {
                          "name": "color",
                          "type": "ordinal",
                          "range": [
                            "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#e6550d",
                            "#fd8d3c", "#fdae6b", "#fdd0a2", "#31a354", "#74c476",
                            "#a1d99b", "#c7e9c0", "#756bb1", "#9e9ac8", "#bcbddc",
                            "#dadaeb", "#636363", "#969696", "#bdbdbd", "#d9d9d9"
                          ]
                      },
                      {
                          "name": "size",
                          "type": "ordinal",
                          "domain": [0, 1, 2, 3, 4],
                          "range": [256, 28, 20, 14, 6]
                      },
                      {
                          "name": "opacity",
                          "type": "ordinal",
                          "domain": [0, 1, 2, 3],
                          "range": [0.15, 0.5, 0.8, 1.0]
                      },
                      {
                          "name": "r",
                          "type": "sqrt",
                          "domain": { "data": "table", "field": "data.size" },
                          "range": [20, 100]
                      }
                    ],
                    "marks": [
                      {
                          "type": "arc",
                          "from": {
                              "data": "tree"
                          },
                          "interactive": false,
                          "properties": {
                              "enter": {
                                  "x": { "group": "width", "mult": 0.5 },
                                  "y": { "group": "height", "mult": 0.5 },
                                  "innerRadius": { "field": "innerRadius" },
                                  "startAngle": { "field": "startAngle" },
                                  "outerRadius": { "field": "outerRadius" },
                                  "endAngle": { "field": "endAngle" },
                                  "fill": { "scale": "color", "field": "data.name" },
                                  "stroke": { "value": "#fff" }
                              }
                          }
                      },
                      {
                          "type": "arc",
                          "from": {
                              "data": "tree"
                          },
                          "properties": {
                              "enter": {
                                  "x": { "group": "width", "mult": 0.5 },
                                  "y": { "group": "height", "mult": 0.5 },
                                  "innerRadius": { "field": "innerRadius" },
                                  "startAngle": { "field": "startAngle" },
                                  "outerRadius": { "field": "outerRadius" },
                                  "endAngle": { "field": "endAngle" },
                                  "stroke": { "value": "#fff" }
                              },
                              "update": {
                                  "fill": { "value": "rgba(0,0,0,0)" }
                              },
                              "hover": {
                                  "fill": { "value": "red" }
                              }
                          }
                      },
                      {
                          "type": "text",
                          "from": {
                              "data": "tree",
                              "transform": [{ "type": "filter", "test": "(d.data.name.length < 12) && ((d.endAngle - d.startAngle) > 0.045)" }]
                          },
                          "interactive": false,
                          "properties": {
                              "enter": {
                                  "x": { "group": "width", "mult": 0.5 },
                                  "y": { "group": "height", "mult": 0.5 },
                                  "theta": { "field": "midAngle" },
                                  "angle": { "field": "textAngle" },
                                  "radius": { "field": "innerRadius" },
                                  "font": { "value": "Times New Roman" },
                                  "fontSize": { "value": "14" },
                                  "align": { "field": "textAlign" },
                                  "baseline": { "value": "middle" },
                                  "fill": { "value": "#000" },
                                  "text": { "field": "data.name" }
                              },
                              "update": {
                                  "fill": { "value": "#000" }
                              },
                              "hover": {
                                  "fill": { "value": "#000" }
                              }
                          }
                      }
                    ]
                }
            }
        }
    },
    'chart': function () {
        return {
            vega: {
                vegaSpec: {
                    "width": 400,
                    "height": 200,
                    "padding": { "top": 10, "left": 30, "bottom": 20, "right": 10 },
                    "data": [
                      {
                          "name": "table",
                          "values": [
                            { "x": "A", "y": 28 }, { "x": "B", "y": 55 }, { "x": "C", "y": 43 },
                            { "x": "D", "y": 91 }, { "x": "E", "y": 81 }, { "x": "F", "y": 53 },
                            { "x": "G", "y": 19 }, { "x": "H", "y": 87 }, { "x": "I", "y": 52 }
                          ]
                      }
                    ],
                    "scales": [
                      { "name": "x", "type": "ordinal", "range": "width", "domain": { "data": "table", "field": "data.x" } },
                      { "name": "y", "range": "height", "nice": true, "domain": { "data": "table", "field": "data.y" } }
                    ],
                    "axes": [
                      { "type": "x", "scale": "x" },
                      { "type": "y", "scale": "y" }
                    ],
                    "marks": [
                      {
                          "type": "rect",
                          "from": { "data": "table" },
                          "properties": {
                              "enter": {
                                  "x": { "scale": "x", "field": "data.x" },
                                  "width": { "scale": "x", "band": true, "offset": -1 },
                                  "y": { "scale": "y", "field": "data.y" },
                                  "y2": { "scale": "y", "value": 0 }
                              },
                              "update": { "fill": { "value": "steelblue" } },
                              "hover": { "fill": { "value": "red" } }
                          }
                      }
                    ]
                }
            }
        };
    },
    'icicle': function () {
        return {
            vega: {
                vegaSpec: {
                    "name": "icicle",
                    "width": 960,
                    "height": 500,
                    "padding": 2.5,
                    "data": [
                      {
                          "name": "tree",
                          "values": this.flare,
                          "format": { "type": "treejson" },
                          "transform": [
                            { "type": "icicle", "value": "data.size" }
                          ]
                      }
                    ],
                    "scales": [
                      {
                          "name": "color",
                          "type": "ordinal",
                          "range": [
                            "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#e6550d",
                            "#fd8d3c", "#fdae6b", "#fdd0a2", "#31a354", "#74c476",
                            "#a1d99b", "#c7e9c0", "#756bb1", "#9e9ac8", "#bcbddc",
                            "#dadaeb", "#636363", "#969696", "#bdbdbd", "#d9d9d9"
                          ]
                      },
                      {
                          "name": "size",
                          "type": "ordinal",
                          "domain": [0, 1, 2, 3],
                          "range": [256, 28, 20, 14]
                      },
                      {
                          "name": "opacity",
                          "type": "ordinal",
                          "domain": [0, 1, 2, 3],
                          "range": [0.15, 0.5, 0.8, 1.0]
                      }
                    ],
                    "marks": [
                      {
                          "type": "rect",
                          "from": {
                              "data": "tree"
                          },
                          "interactive": false,
                          "properties": {
                              "enter": {
                                  "x": { "field": "x" },
                                  "y": { "field": "y" },
                                  "width": { "field": "width" },
                                  "height": { "field": "height" },
                                  "fill": { "scale": "color", "field": "data.name" }
                              }
                          }
                      },
                      {
                          "type": "rect",
                          "from": {
                              "data": "tree"
                          },
                          "properties": {
                              "enter": {
                                  "x": { "field": "x" },
                                  "y": { "field": "y" },
                                  "width": { "field": "width" },
                                  "height": { "field": "height" },
                                  "stroke": { "value": "#fff" }
                              },
                              "update": {
                                  "fill": { "value": "rgba(0,0,0,0)" }
                              },
                              "hover": {
                                  "fill": { "value": "red" }
                              }
                          }
                      },
                      {
                          "type": "text",
                          "from": {
                              "data": "tree",
                              "transform": [{ "type": "filter", "test": "d.values" }]
                          },
                          "interactive": false,
                          "properties": {
                              "enter": {
                                  "x": { "field": "x" },
                                  "y": { "field": "y" },
                                  "dx": { "field": "width", "mult": 0.5 },
                                  "dy": { "field": "height", "mult": 0.5 },
                                  "font": { "value": "Helvetica Neue" },
                                  "fontSize": { "scale": "size", "field": "depth" },
                                  "align": { "value": "center" },
                                  "baseline": { "value": "middle" },
                                  "fill": { "value": "#000" },
                                  "fillOpacity": { "scale": "opacity", "field": "depth" },
                                  "text": { "field": "data.name" }
                              }
                          }
                      }
                    ]
                }
            }
        };
    }
});
