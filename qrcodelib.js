
  /*
  html2canvas 0.4.0 <http://html2canvas.hertzen.com>
  Copyright (c) 2013 Niklas von Hertzen (@niklasvh)

  Released under MIT License
*/
(function (window, document, undefined) {

      "use strict";

      var _html2canvas = {},
      previousElement,
      computedCSS,
      html2canvas;

      function h2clog(a) {
          if (_html2canvas.logging && window.console && window.console.log) {
              window.console.log(a);
          }
      }

      _html2canvas.Util = {};

      _html2canvas.Util.trimText = (function (isNative) {
          return function (input) {
              if (isNative) {
                  return isNative.apply(input);
              } else {
                  return ((input || '') + '').replace(/^\s+|\s+$/g, '');
              }
          };
      })(String.prototype.trim);

      _html2canvas.Util.parseBackgroundImage = function (value) {
          var whitespace = ' \r\n\t',
              method, definition, prefix, prefix_i, block, results = [],
              c, mode = 0,
              numParen = 0,
              quote, args;

          var appendResult = function () {
              if (method) {
                  if (definition.substr(0, 1) === '"') {
                      definition = definition.substr(1, definition.length - 2);
                  }
                  if (definition) {
                      args.push(definition);
                  }
                  if (method.substr(0, 1) === '-' && (prefix_i = method.indexOf('-', 1) + 1) > 0) {
                      prefix = method.substr(0, prefix_i);
                      method = method.substr(prefix_i);
                  }
                  results.push({
                      prefix: prefix,
                      method: method.toLowerCase(),
                      value: block,
                      args: args
                  });
              }
              args = []; //for some odd reason, setting .length = 0 didn't work in safari
              method = prefix = definition = block = '';
          };

          appendResult();
          for (var i = 0, ii = value.length; i < ii; i++) {
              c = value[i];
              if (mode === 0 && whitespace.indexOf(c) > -1) {
                  continue;
              }
              switch (c) {
                  case '"':
                      if (!quote) {
                          quote = c;
                      } else if (quote === c) {
                          quote = null;
                      }
                      break;

                  case '(':
                      if (quote) {
                          break;
                      } else if (mode === 0) {
                          mode = 1;
                          block += c;
                          continue;
                      } else {
                          numParen++;
                      }
                      break;

                  case ')':
                      if (quote) {
                          break;
                      } else if (mode === 1) {
                          if (numParen === 0) {
                              mode = 0;
                              block += c;
                              appendResult();
                              continue;
                          } else {
                              numParen--;
                          }
                      }
                      break;

                  case ',':
                      if (quote) {
                          break;
                      } else if (mode === 0) {
                          appendResult();
                          continue;
                      } else if (mode === 1) {
                          if (numParen === 0 && !method.match(/^url$/i)) {
                              args.push(definition);
                              definition = '';
                              block += c;
                              continue;
                          }
                      }
                      break;
              }

              block += c;
              if (mode === 0) {
                  method += c;
              } else {
                  definition += c;
              }
          }
          appendResult();

          return results;
      };

      _html2canvas.Util.Bounds = function getBounds(el) {
          var clientRect,
          bounds = {};

          if (el.getBoundingClientRect) {
              clientRect = el.getBoundingClientRect();


              // TODO add scroll position to bounds, so no scrolling of window necessary
              bounds.top = clientRect.top;
              bounds.bottom = clientRect.bottom || (clientRect.top + clientRect.height);
              bounds.left = clientRect.left;

              // older IE doesn't have width/height, but top/bottom instead
              bounds.width = clientRect.width || (clientRect.right - clientRect.left);
              bounds.height = clientRect.height || (clientRect.bottom - clientRect.top);

              return bounds;

          }
      };

      _html2canvas.Util.getCSS = function (el, attribute, index) {
          // return $(el).css(attribute);

          var val,
          isBackgroundSizePosition = attribute.match(/^background(Size|Position)$/);

          function toPX(attribute, val) {
              var rsLeft = el.runtimeStyle && el.runtimeStyle[attribute],
                  left,
                  style = el.style;

              // Check if we are not dealing with pixels, (Opera has issues with this)
              // Ported from jQuery css.js
              // From the awesome hack by Dean Edwards
              // http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

              // If we're not dealing with a regular pixel number
              // but a number that has a weird ending, we need to convert it to pixels

              if (!/^-?[0-9]+\.?[0-9]*(?:px)?$/i.test(val) && /^-?\d/.test(val)) {

                  // Remember the original values
                  left = style.left;

                  // Put in the new values to get a computed value out
                  if (rsLeft) {
                      el.runtimeStyle.left = el.currentStyle.left;
                  }
                  style.left = attribute === "fontSize" ? "1em" : (val || 0);
                  val = style.pixelLeft + "px";

                  // Revert the changed values
                  style.left = left;
                  if (rsLeft) {
                      el.runtimeStyle.left = rsLeft;
                  }

              }

              if (!/^(thin|medium|thick)$/i.test(val)) {
                  return Math.round(parseFloat(val)) + "px";
              }

              return val;
          }

          if (previousElement !== el) {
              computedCSS = document.defaultView.getComputedStyle(el, null);
          }
          val = computedCSS[attribute];

          if (isBackgroundSizePosition) {
              val = (val || '').split(',');
              val = val[index || 0] || val[0] || 'auto';
              val = _html2canvas.Util.trimText(val).split(' ');

              if (attribute === 'backgroundSize' && (!val[0] || val[0].match(/cover|contain|auto/))) {
                  //these values will be handled in the parent function

              } else {
                  val[0] = (val[0].indexOf("%") === -1) ? toPX(attribute + "X", val[0]) : val[0];
                  if (val[1] === undefined) {
                      if (attribute === 'backgroundSize') {
                          val[1] = 'auto';
                          return val;
                      } else {
                          // IE 9 doesn't return double digit always
                          val[1] = val[0];
                      }
                  }
                  val[1] = (val[1].indexOf("%") === -1) ? toPX(attribute + "Y", val[1]) : val[1];
              }
          } else if (/border(Top|Bottom)(Left|Right)Radius/.test(attribute)) {
              var arr = val.split(" ");
              if (arr.length <= 1) {
                  arr[1] = arr[0];
              }
              arr[0] = parseInt(arr[0], 10);
              arr[1] = parseInt(arr[1], 10);
              val = arr;
          }

          return val;
      };

      _html2canvas.Util.resizeBounds = function (current_width, current_height, target_width, target_height, stretch_mode) {
          var target_ratio = target_width / target_height,
              current_ratio = current_width / current_height,
              output_width, output_height;

          if (!stretch_mode || stretch_mode === 'auto') {
              output_width = target_width;
              output_height = target_height;

          } else {
              if (target_ratio < current_ratio ^ stretch_mode === 'contain') {
                  output_height = target_height;
                  output_width = target_height * current_ratio;
              } else {
                  output_width = target_width;
                  output_height = target_width / current_ratio;
              }
          }

          return {
              width: output_width,
              height: output_height
          };
      };

      function backgroundBoundsFactory(prop, el, bounds, image, imageIndex, backgroundSize) {
          var bgposition = _html2canvas.Util.getCSS(el, prop, imageIndex),
              topPos,
              left,
              percentage,
              val;

          if (bgposition.length === 1) {
              val = bgposition[0];

              bgposition = [];

              bgposition[0] = val;
              bgposition[1] = val;
          }

          if (bgposition[0].toString().indexOf("%") !== -1) {
              percentage = (parseFloat(bgposition[0]) / 100);
              left = bounds.width * percentage;
              if (prop !== 'backgroundSize') {
                  left -= (backgroundSize || image).width * percentage;
              }

          } else {
              if (prop === 'backgroundSize') {
                  if (bgposition[0] === 'auto') {
                      left = image.width;

                  } else {
                      if (bgposition[0].match(/contain|cover/)) {
                          var resized = _html2canvas.Util.resizeBounds(image.width, image.height, bounds.width, bounds.height, bgposition[0]);
                          left = resized.width;
                          topPos = resized.height;
                      } else {
                          left = parseInt(bgposition[0], 10);
                      }
                  }

              } else {
                  left = parseInt(bgposition[0], 10);
              }
          }


          if (bgposition[1] === 'auto') {
              topPos = left / image.width * image.height;
          } else if (bgposition[1].toString().indexOf("%") !== -1) {
              percentage = (parseFloat(bgposition[1]) / 100);
              topPos = bounds.height * percentage;
              if (prop !== 'backgroundSize') {
                  topPos -= (backgroundSize || image).height * percentage;
              }

          } else {
              topPos = parseInt(bgposition[1], 10);
          }

          return [left, topPos];
      }

      _html2canvas.Util.BackgroundPosition = function (el, bounds, image, imageIndex, backgroundSize) {
          var result = backgroundBoundsFactory('backgroundPosition', el, bounds, image, imageIndex, backgroundSize);
          return {
              left: result[0],
              top: result[1]
          };
      };
      _html2canvas.Util.BackgroundSize = function (el, bounds, image, imageIndex) {
          var result = backgroundBoundsFactory('backgroundSize', el, bounds, image, imageIndex);
          return {
              width: result[0],
              height: result[1]
          };
      };

      _html2canvas.Util.Extend = function (options, defaults) {
          for (var key in options) {
              if (options.hasOwnProperty(key)) {
                  defaults[key] = options[key];
              }
          }
          return defaults;
      };


      /*
       * Derived from jQuery.contents()
       * Copyright 2010, John Resig
       * Dual licensed under the MIT or GPL Version 2 licenses.
       * http://jquery.org/license
       */
      _html2canvas.Util.Children = function (elem) {


          var children;
          try {

              children = (elem.nodeName && elem.nodeName.toUpperCase() === "IFRAME") ? elem.contentDocument || elem.contentWindow.document : (function (array) {
                  var ret = [];

                  if (array !== null) {

                      (function (first, second) {
                          var i = first.length,
                              j = 0;

                          if (typeof second.length === "number") {
                              for (var l = second.length; j < l; j++) {
                                  first[i++] = second[j];
                              }

                          } else {
                              while (second[j] !== undefined) {
                                  first[i++] = second[j++];
                              }
                          }

                          first.length = i;

                          return first;
                      })(ret, array);

                  }

                  return ret;
              })(elem.childNodes);

          } catch (ex) {
              h2clog("html2canvas.Util.Children failed with exception: " + ex.message);
              children = [];
          }
          return children;
      };

      _html2canvas.Util.Font = (function () {

          var fontData = {};

          return function (font, fontSize, doc) {
              if (fontData[font + "-" + fontSize] !== undefined) {
                  return fontData[font + "-" + fontSize];
              }

              var container = doc.createElement('div'),
                  img = doc.createElement('img'),
                  span = doc.createElement('span'),
                  sampleText = 'Hidden Text',
                  baseline,
                  middle,
                  metricsObj;

              container.style.visibility = "hidden";
              container.style.fontFamily = font;
              container.style.fontSize = fontSize;
              container.style.margin = 0;
              container.style.padding = 0;

              doc.body.appendChild(container);

              // http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever (handtinywhite.gif)
              img.src = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";
              img.width = 1;
              img.height = 1;

              img.style.margin = 0;
              img.style.padding = 0;
              img.style.verticalAlign = "baseline";

              span.style.fontFamily = font;
              span.style.fontSize = fontSize;
              span.style.margin = 0;
              span.style.padding = 0;

              span.appendChild(doc.createTextNode(sampleText));
              container.appendChild(span);
              container.appendChild(img);
              baseline = (img.offsetTop - span.offsetTop) + 1;

              container.removeChild(span);
              container.appendChild(doc.createTextNode(sampleText));

              container.style.lineHeight = "normal";
              img.style.verticalAlign = "super";

              middle = (img.offsetTop - container.offsetTop) + 1;
              metricsObj = {
                  baseline: baseline,
                  lineWidth: 1,
                  middle: middle
              };

              fontData[font + "-" + fontSize] = metricsObj;

              doc.body.removeChild(container);

              return metricsObj;
          };
      })();

      (function () {

          _html2canvas.Generate = {};

          var reGradients = [
              /^(-webkit-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
              /^(-o-linear-gradient)\(([a-z\s]+)([\w\d\.\s,%\(\)]+)\)$/,
              /^(-webkit-gradient)\((linear|radial),\s((?:\d{1,3}%?)\s(?:\d{1,3}%?),\s(?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)\-]+)\)$/,
              /^(-moz-linear-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?))([\w\d\.\s,%\(\)]+)\)$/,
              /^(-webkit-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z\-]+)([\w\d\.\s,%\(\)]+)\)$/,
              /^(-moz-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s?([a-z\-]*)([\w\d\.\s,%\(\)]+)\)$/,
              /^(-o-radial-gradient)\(((?:\d{1,3}%?)\s(?:\d{1,3}%?)),\s(\w+)\s([a-z\-]+)([\w\d\.\s,%\(\)]+)\)$/];

          /*
           * TODO: Add IE10 vendor prefix (-ms) support
           * TODO: Add W3C gradient (linear-gradient) support
           * TODO: Add old Webkit -webkit-gradient(radial, ...) support
           * TODO: Maybe some RegExp optimizations are possible ;o)
           */
          _html2canvas.Generate.parseGradient = function (css, bounds) {
              var gradient, i, len = reGradients.length,
                  m1, stop, m2, m2Len, step, m3, tl, tr, br, bl;

              for (i = 0; i < len; i += 1) {
                  m1 = css.match(reGradients[i]);
                  if (m1) {
                      break;
                  }
              }

              if (m1) {
                  switch (m1[1]) {
                      case '-webkit-linear-gradient':
                      case '-o-linear-gradient':

                          gradient = {
                              type: 'linear',
                              x0: null,
                              y0: null,
                              x1: null,
                              y1: null,
                              colorStops: []
                          };

                          // get coordinates
                          m2 = m1[2].match(/\w+/g);
                          if (m2) {
                              m2Len = m2.length;
                              for (i = 0; i < m2Len; i += 1) {
                                  switch (m2[i]) {
                                      case 'top':
                                          gradient.y0 = 0;
                                          gradient.y1 = bounds.height;
                                          break;

                                      case 'right':
                                          gradient.x0 = bounds.width;
                                          gradient.x1 = 0;
                                          break;

                                      case 'bottom':
                                          gradient.y0 = bounds.height;
                                          gradient.y1 = 0;
                                          break;

                                      case 'left':
                                          gradient.x0 = 0;
                                          gradient.x1 = bounds.width;
                                          break;
                                  }
                              }
                          }
                          if (gradient.x0 === null && gradient.x1 === null) { // center
                              gradient.x0 = gradient.x1 = bounds.width / 2;
                          }
                          if (gradient.y0 === null && gradient.y1 === null) { // center
                              gradient.y0 = gradient.y1 = bounds.height / 2;
                          }

                          // get colors and stops
                          m2 = m1[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g);
                          if (m2) {
                              m2Len = m2.length;
                              step = 1 / Math.max(m2Len - 1, 1);
                              for (i = 0; i < m2Len; i += 1) {
                                  m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/);
                                  if (m3[2]) {
                                      stop = parseFloat(m3[2]);
                                      if (m3[3] === '%') {
                                          stop /= 100;
                                      } else { // px - stupid opera
                                          stop /= bounds.width;
                                      }
                                  } else {
                                      stop = i * step;
                                  }
                                  gradient.colorStops.push({
                                      color: m3[1],
                                      stop: stop
                                  });
                              }
                          }
                          break;

                      case '-webkit-gradient':

                          gradient = {
                              type: m1[2] === 'radial' ? 'circle' : m1[2], // TODO: Add radial gradient support for older mozilla definitions
                              x0: 0,
                              y0: 0,
                              x1: 0,
                              y1: 0,
                              colorStops: []
                          };

                          // get coordinates
                          m2 = m1[3].match(/(\d{1,3})%?\s(\d{1,3})%?,\s(\d{1,3})%?\s(\d{1,3})%?/);
                          if (m2) {
                              gradient.x0 = (m2[1] * bounds.width) / 100;
                              gradient.y0 = (m2[2] * bounds.height) / 100;
                              gradient.x1 = (m2[3] * bounds.width) / 100;
                              gradient.y1 = (m2[4] * bounds.height) / 100;
                          }

                          // get colors and stops
                          m2 = m1[4].match(/((?:from|to|color-stop)\((?:[0-9\.]+,\s)?(?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)\))+/g);
                          if (m2) {
                              m2Len = m2.length;
                              for (i = 0; i < m2Len; i += 1) {
                                  m3 = m2[i].match(/(from|to|color-stop)\(([0-9\.]+)?(?:,\s)?((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\)/);
                                  stop = parseFloat(m3[2]);
                                  if (m3[1] === 'from') {
                                      stop = 0.0;
                                  }
                                  if (m3[1] === 'to') {
                                      stop = 1.0;
                                  }
                                  gradient.colorStops.push({
                                      color: m3[3],
                                      stop: stop
                                  });
                              }
                          }
                          break;

                      case '-moz-linear-gradient':

                          gradient = {
                              type: 'linear',
                              x0: 0,
                              y0: 0,
                              x1: 0,
                              y1: 0,
                              colorStops: []
                          };

                          // get coordinates
                          m2 = m1[2].match(/(\d{1,3})%?\s(\d{1,3})%?/);

                          // m2[1] == 0%   -> left
                          // m2[1] == 50%  -> center
                          // m2[1] == 100% -> right

                          // m2[2] == 0%   -> top
                          // m2[2] == 50%  -> center
                          // m2[2] == 100% -> bottom

                          if (m2) {
                              gradient.x0 = (m2[1] * bounds.width) / 100;
                              gradient.y0 = (m2[2] * bounds.height) / 100;
                              gradient.x1 = bounds.width - gradient.x0;
                              gradient.y1 = bounds.height - gradient.y0;
                          }

                          // get colors and stops
                          m2 = m1[3].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}%)?)+/g);
                          if (m2) {
                              m2Len = m2.length;
                              step = 1 / Math.max(m2Len - 1, 1);
                              for (i = 0; i < m2Len; i += 1) {
                                  m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%)?/);
                                  if (m3[2]) {
                                      stop = parseFloat(m3[2]);
                                      if (m3[3]) { // percentage
                                          stop /= 100;
                                      }
                                  } else {
                                      stop = i * step;
                                  }
                                  gradient.colorStops.push({
                                      color: m3[1],
                                      stop: stop
                                  });
                              }
                          }
                          break;

                      case '-webkit-radial-gradient':
                      case '-moz-radial-gradient':
                      case '-o-radial-gradient':

                          gradient = {
                              type: 'circle',
                              x0: 0,
                              y0: 0,
                              x1: bounds.width,
                              y1: bounds.height,
                              cx: 0,
                              cy: 0,
                              rx: 0,
                              ry: 0,
                              colorStops: []
                          };

                          // center
                          m2 = m1[2].match(/(\d{1,3})%?\s(\d{1,3})%?/);
                          if (m2) {
                              gradient.cx = (m2[1] * bounds.width) / 100;
                              gradient.cy = (m2[2] * bounds.height) / 100;
                          }

                          // size
                          m2 = m1[3].match(/\w+/);
                          m3 = m1[4].match(/[a-z\-]*/);
                          if (m2 && m3) {
                              switch (m3[0]) {
                                  case 'farthest-corner':
                                  case 'cover':
                                      // is equivalent to farthest-corner
                                  case '':
                                      // mozilla removes "cover" from definition :(
                                      tl = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.cy, 2));
                                      tr = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                                      br = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                                      bl = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.cy, 2));
                                      gradient.rx = gradient.ry = Math.max(tl, tr, br, bl);
                                      break;
                                  case 'closest-corner':
                                      tl = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.cy, 2));
                                      tr = Math.sqrt(Math.pow(gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                                      br = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.y1 - gradient.cy, 2));
                                      bl = Math.sqrt(Math.pow(gradient.x1 - gradient.cx, 2) + Math.pow(gradient.cy, 2));
                                      gradient.rx = gradient.ry = Math.min(tl, tr, br, bl);
                                      break;
                                  case 'farthest-side':
                                      if (m2[0] === 'circle') {
                                          gradient.rx = gradient.ry = Math.max(
                                          gradient.cx,
                                          gradient.cy,
                                          gradient.x1 - gradient.cx,
                                          gradient.y1 - gradient.cy);
                                      } else { // ellipse

                                          gradient.type = m2[0];

                                          gradient.rx = Math.max(
                                          gradient.cx,
                                          gradient.x1 - gradient.cx);
                                          gradient.ry = Math.max(
                                          gradient.cy,
                                          gradient.y1 - gradient.cy);
                                      }
                                      break;
                                  case 'closest-side':
                                  case 'contain':
                                      // is equivalent to closest-side
                                      if (m2[0] === 'circle') {
                                          gradient.rx = gradient.ry = Math.min(
                                          gradient.cx,
                                          gradient.cy,
                                          gradient.x1 - gradient.cx,
                                          gradient.y1 - gradient.cy);
                                      } else { // ellipse

                                          gradient.type = m2[0];

                                          gradient.rx = Math.min(
                                          gradient.cx,
                                          gradient.x1 - gradient.cx);
                                          gradient.ry = Math.min(
                                          gradient.cy,
                                          gradient.y1 - gradient.cy);
                                      }
                                      break;

                                      // TODO: add support for "30px 40px" sizes (webkit only)
                              }
                          }

                          // color stops
                          m2 = m1[5].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\)(?:\s\d{1,3}(?:%|px))?)+/g);
                          if (m2) {
                              m2Len = m2.length;
                              step = 1 / Math.max(m2Len - 1, 1);
                              for (i = 0; i < m2Len; i += 1) {
                                  m3 = m2[i].match(/((?:rgb|rgba)\(\d{1,3},\s\d{1,3},\s\d{1,3}(?:,\s[0-9\.]+)?\))\s*(\d{1,3})?(%|px)?/);
                                  if (m3[2]) {
                                      stop = parseFloat(m3[2]);
                                      if (m3[3] === '%') {
                                          stop /= 100;
                                      } else { // px - stupid opera
                                          stop /= bounds.width;
                                      }
                                  } else {
                                      stop = i * step;
                                  }
                                  gradient.colorStops.push({
                                      color: m3[1],
                                      stop: stop
                                  });
                              }
                          }
                          break;
                  }
              }

              return gradient;
          };

          _html2canvas.Generate.Gradient = function (src, bounds) {
              if (bounds.width === 0 || bounds.height === 0) {
                  return;
              }

              var canvas = document.createElement('canvas'),
                  ctx = canvas.getContext('2d'),
                  gradient, grad, i, len;

              canvas.width = bounds.width;
              canvas.height = bounds.height;

              // TODO: add support for multi defined background gradients
              gradient = _html2canvas.Generate.parseGradient(src, bounds);

              if (gradient) {
                  if (gradient.type === 'linear') {
                      grad = ctx.createLinearGradient(gradient.x0, gradient.y0, gradient.x1, gradient.y1);

                      for (i = 0, len = gradient.colorStops.length; i < len; i += 1) {
                          try {
                              grad.addColorStop(gradient.colorStops[i].stop, gradient.colorStops[i].color);
                          } catch (e) {
                              h2clog(['failed to add color stop: ', e, '; tried to add: ', gradient.colorStops[i], '; stop: ', i, '; in: ', src]);
                          }
                      }

                      ctx.fillStyle = grad;
                      ctx.fillRect(0, 0, bounds.width, bounds.height);

                  } else if (gradient.type === 'circle') {

                      grad = ctx.createRadialGradient(gradient.cx, gradient.cy, 0, gradient.cx, gradient.cy, gradient.rx);

                      for (i = 0, len = gradient.colorStops.length; i < len; i += 1) {
                          try {
                              grad.addColorStop(gradient.colorStops[i].stop, gradient.colorStops[i].color);
                          } catch (e) {
                              h2clog(['failed to add color stop: ', e, '; tried to add: ', gradient.colorStops[i], '; stop: ', i, '; in: ', src]);
                          }
                      }

                      ctx.fillStyle = grad;
                      ctx.fillRect(0, 0, bounds.width, bounds.height);

                  } else if (gradient.type === 'ellipse') {

                      // draw circle
                      var canvasRadial = document.createElement('canvas'),
                          ctxRadial = canvasRadial.getContext('2d'),
                          ri = Math.max(gradient.rx, gradient.ry),
                          di = ri * 2,
                          imgRadial;

                      canvasRadial.width = canvasRadial.height = di;

                      grad = ctxRadial.createRadialGradient(gradient.rx, gradient.ry, 0, gradient.rx, gradient.ry, ri);

                      for (i = 0, len = gradient.colorStops.length; i < len; i += 1) {
                          try {
                              grad.addColorStop(gradient.colorStops[i].stop, gradient.colorStops[i].color);
                          } catch (e) {
                              h2clog(['failed to add color stop: ', e, '; tried to add: ', gradient.colorStops[i], '; stop: ', i, '; in: ', src]);
                          }
                      }

                      ctxRadial.fillStyle = grad;
                      ctxRadial.fillRect(0, 0, di, di);

                      ctx.fillStyle = gradient.colorStops[i - 1].color;
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(canvasRadial, gradient.cx - gradient.rx, gradient.cy - gradient.ry, 2 * gradient.rx, 2 * gradient.ry);

                  }
              }

              return canvas;
          };

          _html2canvas.Generate.ListAlpha = function (number) {
              var tmp = "",
                  modulus;

              do {
                  modulus = number % 26;
                  tmp = String.fromCharCode((modulus) + 64) + tmp;
                  number = number / 26;
              } while ((number * 26) > 26);

              return tmp;
          };

          _html2canvas.Generate.ListRoman = function (number) {
              var romanArray = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"],
                  decimal = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1],
                  roman = "",
                  v,
                  len = romanArray.length;

              if (number <= 0 || number >= 4000) {
                  return number;
              }

              for (v = 0; v < len; v += 1) {
                  while (number >= decimal[v]) {
                      number -= decimal[v];
                      roman += romanArray[v];
                  }
              }

              return roman;

          };

      })();

      function h2cRenderContext(width, height) {
          var storage = [];
          return {
              storage: storage,
              width: width,
              height: height,
              clip: function () {
                  storage.push({
                      type: "function",
                      name: "clip",
                          'arguments': arguments
                  });
              },
              translate: function () {
                  storage.push({
                      type: "function",
                      name: "translate",
                          'arguments': arguments
                  });
              },
              fill: function () {
                  storage.push({
                      type: "function",
                      name: "fill",
                          'arguments': arguments
                  });
              },
              save: function () {
                  storage.push({
                      type: "function",
                      name: "save",
                          'arguments': arguments
                  });
              },
              restore: function () {
                  storage.push({
                      type: "function",
                      name: "restore",
                          'arguments': arguments
                  });
              },
              fillRect: function () {
                  storage.push({
                      type: "function",
                      name: "fillRect",
                          'arguments': arguments
                  });
              },
              createPattern: function () {
                  storage.push({
                      type: "function",
                      name: "createPattern",
                          'arguments': arguments
                  });
              },
              drawShape: function () {

                  var shape = [];

                  storage.push({
                      type: "function",
                      name: "drawShape",
                          'arguments': shape
                  });

                  return {
                      moveTo: function () {
                          shape.push({
                              name: "moveTo",
                                  'arguments': arguments
                          });
                      },
                      lineTo: function () {
                          shape.push({
                              name: "lineTo",
                                  'arguments': arguments
                          });
                      },
                      arcTo: function () {
                          shape.push({
                              name: "arcTo",
                                  'arguments': arguments
                          });
                      },
                      bezierCurveTo: function () {
                          shape.push({
                              name: "bezierCurveTo",
                                  'arguments': arguments
                          });
                      },
                      quadraticCurveTo: function () {
                          shape.push({
                              name: "quadraticCurveTo",
                                  'arguments': arguments
                          });
                      }
                  };

              },
              drawImage: function () {
                  storage.push({
                      type: "function",
                      name: "drawImage",
                          'arguments': arguments
                  });
              },
              fillText: function () {
                  storage.push({
                      type: "function",
                      name: "fillText",
                          'arguments': arguments
                  });
              },
              setVariable: function (variable, value) {
                  storage.push({
                      type: "variable",
                      name: variable,
                          'arguments': value
                  });
              }
          };
      }
      _html2canvas.Parse = function (images, options) {
          window.scroll(0, 0);

          var element = ((options.elements === undefined) ? document.body : options.elements[0]), // select body by default
              numDraws = 0,
              doc = element.ownerDocument,
              support = _html2canvas.Util.Support(options, doc),
              ignoreElementsRegExp = new RegExp("(" + options.ignoreElements + ")"),
              body = doc.body,
              getCSS = _html2canvas.Util.getCSS,
              pseudoHide = "___html2canvas___pseudoelement",
              hidePseudoElements = doc.createElement('style');

          hidePseudoElements.innerHTML = '.' + pseudoHide + '-before:before { content: "" !important; display: none !important; }' +
              '.' + pseudoHide + '-after:after { content: "" !important; display: none !important; }';

          body.appendChild(hidePseudoElements);

          images = images || {};

          function documentWidth() {
              return Math.max(
              Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth),
              Math.max(doc.body.offsetWidth, doc.documentElement.offsetWidth),
              Math.max(doc.body.clientWidth, doc.documentElement.clientWidth));
          }

          function documentHeight() {
              return Math.max(
              Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight),
              Math.max(doc.body.offsetHeight, doc.documentElement.offsetHeight),
              Math.max(doc.body.clientHeight, doc.documentElement.clientHeight));
          }

          function getCSSInt(element, attribute) {
              var val = parseInt(getCSS(element, attribute), 10);
              return (isNaN(val)) ? 0 : val; // borders in old IE are throwing 'medium' for demo.html
          }

          function renderRect(ctx, x, y, w, h, bgcolor) {
              if (bgcolor !== "transparent") {
                  ctx.setVariable("fillStyle", bgcolor);
                  ctx.fillRect(x, y, w, h);
                  numDraws += 1;
              }
          }

          function textTransform(text, transform) {
              switch (transform) {
                  case "lowercase":
                      return text.toLowerCase();
                  case "capitalize":
                      return text.replace(/(^|\s|:|-|\(|\))([a-z])/g, function (m, p1, p2) {
                          if (m.length > 0) {
                              return p1 + p2.toUpperCase();
                          }
                      });
                  case "uppercase":
                      return text.toUpperCase();
                  default:
                      return text;
              }
          }

          function noLetterSpacing(letter_spacing) {
              return (/^(normal|none|0px)$/.test(letter_spacing));
          }

          function drawText(currentText, x, y, ctx) {
              if (currentText !== null && _html2canvas.Util.trimText(currentText).length > 0) {
                  ctx.fillText(currentText, x, y);
                  numDraws += 1;
              }
          }

          function setTextVariables(ctx, el, text_decoration, color) {
              var align = false,
                  bold = getCSS(el, "fontWeight"),
                  family = getCSS(el, "fontFamily"),
                  size = getCSS(el, "fontSize");

              switch (parseInt(bold, 10)) {
                  case 401:
                      bold = "bold";
                      break;
                  case 400:
                      bold = "normal";
                      break;
              }

              ctx.setVariable("fillStyle", color);
              ctx.setVariable("font", [getCSS(el, "fontStyle"), getCSS(el, "fontVariant"), bold, size, family].join(" "));
              ctx.setVariable("textAlign", (align) ? "right" : "left");

              if (text_decoration !== "none") {
                  return _html2canvas.Util.Font(family, size, doc);
              }
          }

          function renderTextDecoration(ctx, text_decoration, bounds, metrics, color) {
              switch (text_decoration) {
                  case "underline":
                      // Draws a line at the baseline of the font
                      // TODO As some browsers display the line as more than 1px if the font-size is big, need to take that into account both in position and size
                      renderRect(ctx, bounds.left, Math.round(bounds.top + metrics.baseline + metrics.lineWidth), bounds.width, 1, color);
                      break;
                  case "overline":
                      renderRect(ctx, bounds.left, Math.round(bounds.top), bounds.width, 1, color);
                      break;
                  case "line-through":
                      // TODO try and find exact position for line-through
                      renderRect(ctx, bounds.left, Math.ceil(bounds.top + metrics.middle + metrics.lineWidth), bounds.width, 1, color);
                      break;
              }
          }

          function getTextBounds(state, text, textDecoration, isLast) {
              var bounds;
              if (support.rangeBounds) {
                  if (textDecoration !== "none" || _html2canvas.Util.trimText(text).length !== 0) {
                      bounds = textRangeBounds(text, state.node, state.textOffset);
                  }
                  state.textOffset += text.length;
              } else if (state.node && typeof state.node.nodeValue === "string") {
                  var newTextNode = (isLast) ? state.node.splitText(text.length) : null;
                  bounds = textWrapperBounds(state.node);
                  state.node = newTextNode;
              }
              return bounds;
          }

          function textRangeBounds(text, textNode, textOffset) {
              var range = doc.createRange();
              range.setStart(textNode, textOffset);
              range.setEnd(textNode, textOffset + text.length);
              return range.getBoundingClientRect();
          }

          function textWrapperBounds(oldTextNode) {
              var parent = oldTextNode.parentNode,
                  wrapElement = doc.createElement('wrapper'),
                  backupText = oldTextNode.cloneNode(true);

              wrapElement.appendChild(oldTextNode.cloneNode(true));
              parent.replaceChild(wrapElement, oldTextNode);

              var bounds = _html2canvas.Util.Bounds(wrapElement);
              parent.replaceChild(backupText, wrapElement);
              return bounds;
          }

          function renderText(el, textNode, stack) {
              var ctx = stack.ctx,
                  color = getCSS(el, "color"),
                  textDecoration = getCSS(el, "textDecoration"),
                  textAlign = getCSS(el, "textAlign"),
                  metrics,
                  textList,
                  state = {
                      node: textNode,
                      textOffset: 0
                  };

              if (_html2canvas.Util.trimText(textNode.nodeValue).length > 0) {
                  textNode.nodeValue = textTransform(textNode.nodeValue, getCSS(el, "textTransform"));
                  textAlign = textAlign.replace(["-webkit-auto"], ["auto"]);

                  textList = (!options.letterRendering && /^(left|right|justify|auto)$/.test(textAlign) && noLetterSpacing(getCSS(el, "letterSpacing"))) ? textNode.nodeValue.split(/(\b| )/) : textNode.nodeValue.split("");

                  metrics = setTextVariables(ctx, el, textDecoration, color);

                  if (options.chinese) {
                      textList.forEach(function (word, index) {
                          if (/.*[\u4E00-\u9FA5].*$/.test(word)) {
                              word = word.split("");
                              word.unshift(index, 1);
                              textList.splice.apply(textList, word);
                          }
                      });
                  }

                  textList.forEach(function (text, index) {
                      var bounds = getTextBounds(state, text, textDecoration, (index < textList.length - 1));
                      if (bounds) {
                          drawText(text, bounds.left, bounds.bottom, ctx);
                          renderTextDecoration(ctx, textDecoration, bounds, metrics, color);
                      }
                  });
              }
          }

          function listPosition(element, val) {
              var boundElement = doc.createElement("boundelement"),
                  originalType,
                  bounds;

              boundElement.style.display = "inline";

              originalType = element.style.listStyleType;
              element.style.listStyleType = "none";

              boundElement.appendChild(doc.createTextNode(val));

              element.insertBefore(boundElement, element.firstChild);

              bounds = _html2canvas.Util.Bounds(boundElement);
              element.removeChild(boundElement);
              element.style.listStyleType = originalType;
              return bounds;
          }

          function elementIndex(el) {
              var i = -1,
                  count = 1,
                  childs = el.parentNode.childNodes;

              if (el.parentNode) {
                  while (childs[++i] !== el) {
                      if (childs[i].nodeType === 1) {
                          count++;
                      }
                  }
                  return count;
              } else {
                  return -1;
              }
          }

          function listItemText(element, type) {
              var currentIndex = elementIndex(element),
                  text;
              switch (type) {
                  case "decimal":
                      text = currentIndex;
                      break;
                  case "decimal-leading-zero":
                      text = (currentIndex.toString().length === 1) ? currentIndex = "0" + currentIndex.toString() : currentIndex.toString();
                      break;
                  case "upper-roman":
                      text = _html2canvas.Generate.ListRoman(currentIndex);
                      break;
                  case "lower-roman":
                      text = _html2canvas.Generate.ListRoman(currentIndex).toLowerCase();
                      break;
                  case "lower-alpha":
                      text = _html2canvas.Generate.ListAlpha(currentIndex).toLowerCase();
                      break;
                  case "upper-alpha":
                      text = _html2canvas.Generate.ListAlpha(currentIndex);
                      break;
              }

              text += ". ";
              return text;
          }

          function renderListItem(element, stack, elBounds) {
              var x,
              text,
              ctx = stack.ctx,
                  type = getCSS(element, "listStyleType"),
                  listBounds;

              if (/^(decimal|decimal-leading-zero|upper-alpha|upper-latin|upper-roman|lower-alpha|lower-greek|lower-latin|lower-roman)$/i.test(type)) {
                  text = listItemText(element, type);
                  listBounds = listPosition(element, text);
                  setTextVariables(ctx, element, "none", getCSS(element, "color"));

                  if (getCSS(element, "listStylePosition") === "inside") {
                      ctx.setVariable("textAlign", "left");
                      x = elBounds.left;
                  } else {
                      return;
                  }

                  drawText(text, x, listBounds.bottom, ctx);
              }
          }

          function loadImage(src) {
              var img = images[src];
              if (img && img.succeeded === true) {
                  return img.img;
              } else {
                  return false;
              }
          }

          function clipBounds(src, dst) {
              var x = Math.max(src.left, dst.left),
                  y = Math.max(src.top, dst.top),
                  x2 = Math.min((src.left + src.width), (dst.left + dst.width)),
                  y2 = Math.min((src.top + src.height), (dst.top + dst.height));

              return {
                  left: x,
                  top: y,
                  width: x2 - x,
                  height: y2 - y
              };
          }

          function setZ(zIndex, parentZ) {
              // TODO fix static elements overlapping relative/absolute elements under same stack, if they are defined after them
              var newContext;
              if (!parentZ) {
                  newContext = h2czContext(0);
                  return newContext;
              }

              if (zIndex !== "auto") {
                  newContext = h2czContext(zIndex);
                  parentZ.children.push(newContext);
                  return newContext;

              }

              return parentZ;
          }

          function renderImage(ctx, element, image, bounds, borders) {

              var paddingLeft = getCSSInt(element, 'paddingLeft'),
                  paddingTop = getCSSInt(element, 'paddingTop'),
                  paddingRight = getCSSInt(element, 'paddingRight'),
                  paddingBottom = getCSSInt(element, 'paddingBottom');

              drawImage(
              ctx,
              image,
              0, //sx
              0, //sy
              image.width, //sw
              image.height, //sh
              bounds.left + paddingLeft + borders[3].width, //dx
              bounds.top + paddingTop + borders[0].width, // dy
              bounds.width - (borders[1].width + borders[3].width + paddingLeft + paddingRight), //dw
              bounds.height - (borders[0].width + borders[2].width + paddingTop + paddingBottom) //dh
              );
          }

          function getBorderData(element) {
              return ["Top", "Right", "Bottom", "Left"].map(function (side) {
                  return {
                      width: getCSSInt(element, 'border' + side + 'Width'),
                      color: getCSS(element, 'border' + side + 'Color')
                  };
              });
          }

          function getBorderRadiusData(element) {
              return ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map(function (side) {
                  return getCSS(element, 'border' + side + 'Radius');
              });
          }

          var getCurvePoints = (function (kappa) {

              return function (x, y, r1, r2) {
                  var ox = (r1) * kappa, // control point offset horizontal
                      oy = (r2) * kappa, // control point offset vertical
                      xm = x + r1, // x-middle
                      ym = y + r2; // y-middle
                  return {
                      topLeft: bezierCurve({
                          x: x,
                          y: ym
                      }, {
                          x: x,
                          y: ym - oy
                      }, {
                          x: xm - ox,
                          y: y
                      }, {
                          x: xm,
                          y: y
                      }),
                      topRight: bezierCurve({
                          x: x,
                          y: y
                      }, {
                          x: x + ox,
                          y: y
                      }, {
                          x: xm,
                          y: ym - oy
                      }, {
                          x: xm,
                          y: ym
                      }),
                      bottomRight: bezierCurve({
                          x: xm,
                          y: y
                      }, {
                          x: xm,
                          y: y + oy
                      }, {
                          x: x + ox,
                          y: ym
                      }, {
                          x: x,
                          y: ym
                      }),
                      bottomLeft: bezierCurve({
                          x: xm,
                          y: ym
                      }, {
                          x: xm - ox,
                          y: ym
                      }, {
                          x: x,
                          y: y + oy
                      }, {
                          x: x,
                          y: y
                      })
                  };
              };
          })(4 * ((Math.sqrt(2) - 1) / 3));

          function bezierCurve(start, startControl, endControl, end) {

              var lerp = function (a, b, t) {
                  return {
                      x: a.x + (b.x - a.x) * t,
                      y: a.y + (b.y - a.y) * t
                  };
              };

              return {
                  start: start,
                  startControl: startControl,
                  endControl: endControl,
                  end: end,
                  subdivide: function (t) {
                      var ab = lerp(start, startControl, t),
                          bc = lerp(startControl, endControl, t),
                          cd = lerp(endControl, end, t),
                          abbc = lerp(ab, bc, t),
                          bccd = lerp(bc, cd, t),
                          dest = lerp(abbc, bccd, t);
                      return [bezierCurve(start, ab, abbc, dest), bezierCurve(dest, bccd, cd, end)];
                  },
                  curveTo: function (borderArgs) {
                      borderArgs.push(["bezierCurve", startControl.x, startControl.y, endControl.x, endControl.y, end.x, end.y]);
                  },
                  curveToReversed: function (borderArgs) {
                      borderArgs.push(["bezierCurve", endControl.x, endControl.y, startControl.x, startControl.y, start.x, start.y]);
                  }
              };
          }

          function parseCorner(borderArgs, radius1, radius2, corner1, corner2, x, y) {
              if (radius1[0] > 0 || radius1[1] > 0) {
                  borderArgs.push(["line", corner1[0].start.x, corner1[0].start.y]);
                  corner1[0].curveTo(borderArgs);
                  corner1[1].curveTo(borderArgs);
              } else {
                  borderArgs.push(["line", x, y]);
              }

              if (radius2[0] > 0 || radius2[1] > 0) {
                  borderArgs.push(["line", corner2[0].start.x, corner2[0].start.y]);
              }
          }

          function drawSide(borderData, radius1, radius2, outer1, inner1, outer2, inner2) {
              var borderArgs = [];

              if (radius1[0] > 0 || radius1[1] > 0) {
                  borderArgs.push(["line", outer1[1].start.x, outer1[1].start.y]);
                  outer1[1].curveTo(borderArgs);
              } else {
                  borderArgs.push(["line", borderData.c1[0], borderData.c1[1]]);
              }

              if (radius2[0] > 0 || radius2[1] > 0) {
                  borderArgs.push(["line", outer2[0].start.x, outer2[0].start.y]);
                  outer2[0].curveTo(borderArgs);
                  borderArgs.push(["line", inner2[0].end.x, inner2[0].end.y]);
                  inner2[0].curveToReversed(borderArgs);
              } else {
                  borderArgs.push(["line", borderData.c2[0], borderData.c2[1]]);
                  borderArgs.push(["line", borderData.c3[0], borderData.c3[1]]);
              }

              if (radius1[0] > 0 || radius1[1] > 0) {
                  borderArgs.push(["line", inner1[1].end.x, inner1[1].end.y]);
                  inner1[1].curveToReversed(borderArgs);
              } else {
                  borderArgs.push(["line", borderData.c4[0], borderData.c4[1]]);
              }

              return borderArgs;
          }

          function calculateCurvePoints(bounds, borderRadius, borders) {

              var x = bounds.left,
                  y = bounds.top,
                  width = bounds.width,
                  height = bounds.height,

                  tlh = borderRadius[0][0],
                  tlv = borderRadius[0][1],
                  trh = borderRadius[1][0],
                  trv = borderRadius[1][1],
                  brv = borderRadius[2][0],
                  brh = borderRadius[2][1],
                  blh = borderRadius[3][0],
                  blv = borderRadius[3][1],

                  topWidth = width - trh,
                  rightHeight = height - brv,
                  bottomWidth = width - brh,
                  leftHeight = height - blv;

              return {
                  topLeftOuter: getCurvePoints(
                  x,
                  y,
                  tlh,
                  tlv).topLeft.subdivide(0.5),

                  topLeftInner: getCurvePoints(
                  x + borders[3].width,
                  y + borders[0].width,
                  Math.max(0, tlh - borders[3].width),
                  Math.max(0, tlv - borders[0].width)).topLeft.subdivide(0.5),

                  topRightOuter: getCurvePoints(
                  x + topWidth,
                  y,
                  trh,
                  trv).topRight.subdivide(0.5),

                  topRightInner: getCurvePoints(
                  x + Math.min(topWidth, width + borders[3].width),
                  y + borders[0].width, (topWidth > width + borders[3].width) ? 0 : trh - borders[3].width,
                  trv - borders[0].width).topRight.subdivide(0.5),

                  bottomRightOuter: getCurvePoints(
                  x + bottomWidth,
                  y + rightHeight,
                  brh,
                  brv).bottomRight.subdivide(0.5),

                  bottomRightInner: getCurvePoints(
                  x + Math.min(bottomWidth, width + borders[3].width),
                  y + Math.min(rightHeight, height + borders[0].width),
                  Math.max(0, brh - borders[1].width),
                  Math.max(0, brv - borders[2].width)).bottomRight.subdivide(0.5),

                  bottomLeftOuter: getCurvePoints(
                  x,
                  y + leftHeight,
                  blh,
                  blv).bottomLeft.subdivide(0.5),

                  bottomLeftInner: getCurvePoints(
                  x + borders[3].width,
                  y + leftHeight,
                  Math.max(0, blh - borders[3].width),
                  Math.max(0, blv - borders[2].width)).bottomLeft.subdivide(0.5)
              };
          }

          function getBorderClip(element, borderPoints, borders, radius, bounds) {
              var backgroundClip = getCSS(element, 'backgroundClip'),
                  borderArgs = [];

              switch (backgroundClip) {
                  case "content-box":
                  case "padding-box":
                      parseCorner(borderArgs, radius[0], radius[1], borderPoints.topLeftInner, borderPoints.topRightInner, bounds.left + borders[3].width, bounds.top + borders[0].width);
                      parseCorner(borderArgs, radius[1], radius[2], borderPoints.topRightInner, borderPoints.bottomRightInner, bounds.left + bounds.width - borders[1].width, bounds.top + borders[0].width);
                      parseCorner(borderArgs, radius[2], radius[3], borderPoints.bottomRightInner, borderPoints.bottomLeftInner, bounds.left + bounds.width - borders[1].width, bounds.top + bounds.height - borders[2].width);
                      parseCorner(borderArgs, radius[3], radius[0], borderPoints.bottomLeftInner, borderPoints.topLeftInner, bounds.left + borders[3].width, bounds.top + bounds.height - borders[2].width);
                      break;

                  default:
                      parseCorner(borderArgs, radius[0], radius[1], borderPoints.topLeftOuter, borderPoints.topRightOuter, bounds.left, bounds.top);
                      parseCorner(borderArgs, radius[1], radius[2], borderPoints.topRightOuter, borderPoints.bottomRightOuter, bounds.left + bounds.width, bounds.top);
                      parseCorner(borderArgs, radius[2], radius[3], borderPoints.bottomRightOuter, borderPoints.bottomLeftOuter, bounds.left + bounds.width, bounds.top + bounds.height);
                      parseCorner(borderArgs, radius[3], radius[0], borderPoints.bottomLeftOuter, borderPoints.topLeftOuter, bounds.left, bounds.top + bounds.height);
                      break;
              }

              return borderArgs;
          }

          function parseBorders(element, bounds, borders) {
              var x = bounds.left,
                  y = bounds.top,
                  width = bounds.width,
                  height = bounds.height,
                  borderSide,
                  bx,
                  by,
                  bw,
                  bh,
                  borderArgs,
                  // http://www.w3.org/TR/css3-background/#the-border-radius
                  borderRadius = getBorderRadiusData(element),
                  borderPoints = calculateCurvePoints(bounds, borderRadius, borders),
                  borderData = {
                      clip: getBorderClip(element, borderPoints, borders, borderRadius, bounds),
                      borders: []
                  };

              for (borderSide = 0; borderSide < 4; borderSide++) {

                  if (borders[borderSide].width > 0) {
                      bx = x;
                      by = y;
                      bw = width;
                      bh = height - (borders[2].width);

                      switch (borderSide) {
                          case 0:
                              // top border
                              bh = borders[0].width;

                              borderArgs = drawSide({
                                  c1: [bx, by],
                                  c2: [bx + bw, by],
                                  c3: [bx + bw - borders[1].width, by + bh],
                                  c4: [bx + borders[3].width, by + bh]
                              }, borderRadius[0], borderRadius[1],
                              borderPoints.topLeftOuter, borderPoints.topLeftInner, borderPoints.topRightOuter, borderPoints.topRightInner);
                              break;
                          case 1:
                              // right border
                              bx = x + width - (borders[1].width);
                              bw = borders[1].width;

                              borderArgs = drawSide({
                                  c1: [bx + bw, by],
                                  c2: [bx + bw, by + bh + borders[2].width],
                                  c3: [bx, by + bh],
                                  c4: [bx, by + borders[0].width]
                              }, borderRadius[1], borderRadius[2],
                              borderPoints.topRightOuter, borderPoints.topRightInner, borderPoints.bottomRightOuter, borderPoints.bottomRightInner);
                              break;
                          case 2:
                              // bottom border
                              by = (by + height) - (borders[2].width);
                              bh = borders[2].width;

                              borderArgs = drawSide({
                                  c1: [bx + bw, by + bh],
                                  c2: [bx, by + bh],
                                  c3: [bx + borders[3].width, by],
                                  c4: [bx + bw - borders[2].width, by]
                              }, borderRadius[2], borderRadius[3],
                              borderPoints.bottomRightOuter, borderPoints.bottomRightInner, borderPoints.bottomLeftOuter, borderPoints.bottomLeftInner);
                              break;
                          case 3:
                              // left border
                              bw = borders[3].width;

                              borderArgs = drawSide({
                                  c1: [bx, by + bh + borders[2].width],
                                  c2: [bx, by],
                                  c3: [bx + bw, by + borders[0].width],
                                  c4: [bx + bw, by + bh]
                              }, borderRadius[3], borderRadius[0],
                              borderPoints.bottomLeftOuter, borderPoints.bottomLeftInner, borderPoints.topLeftOuter, borderPoints.topLeftInner);
                              break;
                      }

                      borderData.borders.push({
                          args: borderArgs,
                          color: borders[borderSide].color
                      });

                  }
              }

              return borderData;
          }

          function createShape(ctx, args) {
              var shape = ctx.drawShape();
              args.forEach(function (border, index) {
                  shape[(index === 0) ? "moveTo" : border[0] + "To"].apply(null, border.slice(1));
              });
              return shape;
          }

          function renderBorders(ctx, borderArgs, color) {
              if (color !== "transparent") {
                  ctx.setVariable("fillStyle", color);
                  createShape(ctx, borderArgs);
                  ctx.fill();
                  numDraws += 1;
              }
          }

          function renderFormValue(el, bounds, stack) {

              var valueWrap = doc.createElement('valuewrap'),
                  cssPropertyArray = ['lineHeight', 'textAlign', 'fontFamily', 'color', 'fontSize', 'paddingLeft', 'paddingTop', 'width', 'height', 'border', 'borderLeftWidth', 'borderTopWidth'],
                  textValue,
                  textNode;

              cssPropertyArray.forEach(function (property) {
                  try {
                      valueWrap.style[property] = getCSS(el, property);
                  } catch (e) {
                      // Older IE has issues with "border"
                      h2clog("html2canvas: Parse: Exception caught in renderFormValue: " + e.message);
                  }
              });

              valueWrap.style.borderColor = "black";
              valueWrap.style.borderStyle = "solid";
              valueWrap.style.display = "block";
              valueWrap.style.position = "absolute";

              if (/^(submit|reset|button|text|password)$/.test(el.type) || el.nodeName === "SELECT") {
                  valueWrap.style.lineHeight = getCSS(el, "height");
              }

              valueWrap.style.top = bounds.top + "px";
              valueWrap.style.left = bounds.left + "px";

              textValue = (el.nodeName === "SELECT") ? (el.options[el.selectedIndex] || 0).text : el.value;
              if (!textValue) {
                  textValue = el.placeholder;
              }

              textNode = doc.createTextNode(textValue);

              valueWrap.appendChild(textNode);
              body.appendChild(valueWrap);

              renderText(el, textNode, stack);
              body.removeChild(valueWrap);
          }

          function drawImage(ctx) {
              ctx.drawImage.apply(ctx, Array.prototype.slice.call(arguments, 1));
              numDraws += 1;
          }

          function getPseudoElement(el, which) {
              var elStyle = window.getComputedStyle(el, which);
              if (!elStyle || !elStyle.content || elStyle.content === "none" || elStyle.content === "-moz-alt-content") {
                  return;
              }
              var content = elStyle.content + '',
                  first = content.substr(0, 1);
              //strips quotes
              if (first === content.substr(content.length - 1) && first.match(/'|"/)) {
                  content = content.substr(1, content.length - 2);
              }

              var isImage = content.substr(0, 3) === 'url',
                  elps = document.createElement(isImage ? 'img' : 'span');

              elps.className = pseudoHide + "-before " + pseudoHide + "-after";

              Object.keys(elStyle).filter(indexedProperty).forEach(function (prop) {
                  // Prevent assigning of read only CSS Rules, ex. length, parentRule
                  try {
                      elps.style[prop] = elStyle[prop];
                  } catch (e) {
                      h2clog(['Tried to assign readonly property ', prop, 'Error:', e]);
                  }
              });

              if (isImage) {
                  elps.src = _html2canvas.Util.parseBackgroundImage(content)[0].args[0];
              } else {
                  elps.innerHTML = content;
              }
              return elps;
          }

          function indexedProperty(property) {
              return (isNaN(window.parseInt(property, 10)));
          }

          function injectPseudoElements(el, stack) {
              var before = getPseudoElement(el, ':before'),
                  after = getPseudoElement(el, ':after');
              if (!before && !after) {
                  return;
              }

              if (before) {
                  el.className += " " + pseudoHide + "-before";
                  el.parentNode.insertBefore(before, el);
                  parseElement(before, stack, true);
                  el.parentNode.removeChild(before);
                  el.className = el.className.replace(pseudoHide + "-before", "").trim();
              }

              if (after) {
                  el.className += " " + pseudoHide + "-after";
                  el.appendChild(after);
                  parseElement(after, stack, true);
                  el.removeChild(after);
                  el.className = el.className.replace(pseudoHide + "-after", "").trim();
              }

          }

          function renderBackgroundRepeat(ctx, image, backgroundPosition, bounds) {
              var offsetX = Math.round(bounds.left + backgroundPosition.left),
                  offsetY = Math.round(bounds.top + backgroundPosition.top);

              ctx.createPattern(image);
              ctx.translate(offsetX, offsetY);
              ctx.fill();
              ctx.translate(-offsetX, -offsetY);
          }

          function backgroundRepeatShape(ctx, image, backgroundPosition, bounds, left, top, width, height) {
              var args = [];
              args.push(["line", Math.round(left), Math.round(top)]);
              args.push(["line", Math.round(left + width), Math.round(top)]);
              args.push(["line", Math.round(left + width), Math.round(height + top)]);
              args.push(["line", Math.round(left), Math.round(height + top)]);
              createShape(ctx, args);
              ctx.save();
              ctx.clip();
              renderBackgroundRepeat(ctx, image, backgroundPosition, bounds);
              ctx.restore();
          }

          function renderBackgroundColor(ctx, backgroundBounds, bgcolor) {
              renderRect(
              ctx,
              backgroundBounds.left,
              backgroundBounds.top,
              backgroundBounds.width,
              backgroundBounds.height,
              bgcolor);
          }

          function renderBackgroundRepeating(el, bounds, ctx, image, imageIndex) {
              var backgroundSize = _html2canvas.Util.BackgroundSize(el, bounds, image, imageIndex),
                  backgroundPosition = _html2canvas.Util.BackgroundPosition(el, bounds, image, imageIndex, backgroundSize),
                  backgroundRepeat = getCSS(el, "backgroundRepeat").split(",").map(function (value) {
                      return value.trim();
                  });

              image = resizeImage(image, backgroundSize);

              backgroundRepeat = backgroundRepeat[imageIndex] || backgroundRepeat[0];

              switch (backgroundRepeat) {
                  case "repeat-x":
                      backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
                      bounds.left, bounds.top + backgroundPosition.top, 99999, image.height);
                      break;

                  case "repeat-y":
                      backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
                      bounds.left + backgroundPosition.left, bounds.top, image.width, 99999);
                      break;

                  case "no-repeat":
                      backgroundRepeatShape(ctx, image, backgroundPosition, bounds,
                      bounds.left + backgroundPosition.left, bounds.top + backgroundPosition.top, image.width, image.height);
                      break;

                  default:
                      renderBackgroundRepeat(ctx, image, backgroundPosition, {
                          top: bounds.top,
                          left: bounds.left,
                          width: image.width,
                          height: image.height
                      });
                      break;
              }
          }

          function renderBackgroundImage(element, bounds, ctx) {
              var backgroundImage = getCSS(element, "backgroundImage"),
                  backgroundImages = _html2canvas.Util.parseBackgroundImage(backgroundImage),
                  image,
                  imageIndex = backgroundImages.length;

              while (imageIndex--) {
                  backgroundImage = backgroundImages[imageIndex];

                  if (!backgroundImage.args || backgroundImage.args.length === 0) {
                      continue;
                  }

                  var key = backgroundImage.method === 'url' ? backgroundImage.args[0] : backgroundImage.value;

                  image = loadImage(key);

                  // TODO add support for background-origin
                  if (image) {
                      renderBackgroundRepeating(element, bounds, ctx, image, imageIndex);
                  } else {
                      h2clog("html2canvas: Error loading background:", backgroundImage);
                  }
              }
          }

          function resizeImage(image, bounds) {
              if (image.width === bounds.width && image.height === bounds.height) {
                  return image;
              }

              var ctx, canvas = doc.createElement('canvas');
              canvas.width = bounds.width;
              canvas.height = bounds.height;
              ctx = canvas.getContext("2d");
              drawImage(ctx, image, 0, 0, image.width, image.height, 0, 0, bounds.width, bounds.height);
              return canvas;
          }

          function setOpacity(ctx, element, parentStack) {
              var opacity = getCSS(element, "opacity") * ((parentStack) ? parentStack.opacity : 1);
              ctx.setVariable("globalAlpha", opacity);
              return opacity;
          }

          function createStack(element, parentStack, bounds) {

              var ctx = h2cRenderContext((!parentStack) ? documentWidth() : bounds.width, (!parentStack) ? documentHeight() : bounds.height),
                  stack = {
                      ctx: ctx,
                      zIndex: setZ(getCSS(element, "zIndex"), (parentStack) ? parentStack.zIndex : null),
                      opacity: setOpacity(ctx, element, parentStack),
                      cssPosition: getCSS(element, "position"),
                      borders: getBorderData(element),
                      clip: (parentStack && parentStack.clip) ? _html2canvas.Util.Extend({}, parentStack.clip) : null
                  };

              // TODO correct overflow for absolute content residing under a static position
              if (options.useOverflow === true && /(hidden|scroll|auto)/.test(getCSS(element, "overflow")) === true && /(BODY)/i.test(element.nodeName) === false) {
                  stack.clip = (stack.clip) ? clipBounds(stack.clip, bounds) : bounds;
              }

              stack.zIndex.children.push(stack);

              return stack;
          }

          function getBackgroundBounds(borders, bounds, clip) {
              var backgroundBounds = {
                  left: bounds.left + borders[3].width,
                  top: bounds.top + borders[0].width,
                  width: bounds.width - (borders[1].width + borders[3].width),
                  height: bounds.height - (borders[0].width + borders[2].width)
              };

              if (clip) {
                  backgroundBounds = clipBounds(backgroundBounds, clip);
              }

              return backgroundBounds;
          }

          function renderElement(element, parentStack, pseudoElement) {
              var bounds = _html2canvas.Util.Bounds(element),
                  image,
                  bgcolor = (ignoreElementsRegExp.test(element.nodeName)) ? "#efefef" : getCSS(element, "backgroundColor"),
                  stack = createStack(element, parentStack, bounds),
                  borders = stack.borders,
                  ctx = stack.ctx,
                  backgroundBounds = getBackgroundBounds(borders, bounds, stack.clip),
                  borderData = parseBorders(element, bounds, borders);

              createShape(ctx, borderData.clip);

              ctx.save();
              ctx.clip();

              if (backgroundBounds.height > 0 && backgroundBounds.width > 0) {
                  renderBackgroundColor(ctx, bounds, bgcolor);
                  renderBackgroundImage(element, backgroundBounds, ctx);
              }

              ctx.restore();

              borderData.borders.forEach(function (border) {
                  renderBorders(ctx, border.args, border.color);
              });

              if (!pseudoElement) {
                  injectPseudoElements(element, stack);
              }

              switch (element.nodeName) {
                  case "IMG":
                      if ((image = loadImage(element.getAttribute('src')))) {
                          renderImage(ctx, element, image, bounds, borders);
                      } else {
                          h2clog("html2canvas: Error loading <img>:" + element.getAttribute('src'));
                      }
                      break;
                  case "INPUT":
                      // TODO add all relevant type's, i.e. HTML5 new stuff
                      // todo add support for placeholder attribute for browsers which support it
                      if (/^(text|url|email|submit|button|reset)$/.test(element.type) && (element.value || element.placeholder).length > 0) {
                          renderFormValue(element, bounds, stack);
                      }
                      break;
                  case "TEXTAREA":
                      if ((element.value || element.placeholder || "").length > 0) {
                          renderFormValue(element, bounds, stack);
                      }
                      break;
                  case "SELECT":
                      if ((element.options || element.placeholder || "").length > 0) {
                          renderFormValue(element, bounds, stack);
                      }
                      break;
                  case "LI":
                      renderListItem(element, stack, backgroundBounds);
                      break;
                  case "CANVAS":
                      renderImage(ctx, element, element, bounds, borders);
                      break;
              }

              return stack;
          }

          function isElementVisible(element) {
              return (getCSS(element, 'display') !== "none" && getCSS(element, 'visibility') !== "hidden" && !element.hasAttribute("data-html2canvas-ignore"));
          }

          function parseElement(el, stack, pseudoElement) {

              if (isElementVisible(el)) {
                  stack = renderElement(el, stack, pseudoElement) || stack;
                  if (!ignoreElementsRegExp.test(el.nodeName)) {
                      _html2canvas.Util.Children(el).forEach(function (node) {
                          if (node.nodeType === 1) {
                              parseElement(node, stack, pseudoElement);
                          } else if (node.nodeType === 3) {
                              renderText(el, node, stack);
                          }
                      });
                  }
              }
          }

          function svgDOMRender(body, stack) {
              var img = new Image(),
                  docWidth = documentWidth(),
                  docHeight = documentHeight(),
                  html = "";

              function parseDOM(el) {
                  var children = _html2canvas.Util.Children(el),
                      len = children.length,
                      attr,
                      a,
                      alen,
                      elm,
                      i;
                  for (i = 0; i < len; i += 1) {
                      elm = children[i];
                      if (elm.nodeType === 3) {
                          // Text node
                          html += elm.nodeValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                      } else if (elm.nodeType === 1) {
                          // Element
                          if (!/^(script|meta|title)$/.test(elm.nodeName.toLowerCase())) {

                              html += "<" + elm.nodeName.toLowerCase();

                              // add attributes
                              if (elm.hasAttributes()) {
                                  attr = elm.attributes;
                                  alen = attr.length;
                                  for (a = 0; a < alen; a += 1) {
                                      html += " " + attr[a].name + '="' + attr[a].value + '"';
                                  }
                              }


                              html += '>';

                              parseDOM(elm);


                              html += "</" + elm.nodeName.toLowerCase() + ">";
                          }
                      }

                  }

              }

              parseDOM(body);
              img.src = [
                  "data:image/svg+xml,",
                  "<svg xmlns='http://www.w3.org/2000/svg' version='1.1' width='" + docWidth + "' height='" + docHeight + "'>",
                  "<foreignObject width='" + docWidth + "' height='" + docHeight + "'>",
                  "<html xmlns='http://www.w3.org/1999/xhtml' style='margin:0;'>",
              html.replace(/\#/g, "%23"),
                  "</html>",
                  "</foreignObject>",
                  "</svg>"].join("");

              img.onload = function () {
                  stack.svgRender = img;
              };

          }

          function init() {
              var stack = renderElement(element, null);

              if (support.svgRendering) {
                  svgDOMRender(document.documentElement, stack);
              }

              Array.prototype.slice.call(element.children, 0).forEach(function (childElement) {
                  parseElement(childElement, stack);
              });

              stack.backgroundColor = getCSS(document.documentElement, "backgroundColor");
              body.removeChild(hidePseudoElements);
              return stack;
          }

          return init();
      };

      function h2czContext(zindex) {
          return {
              zindex: zindex,
              children: []
          };
      }
      _html2canvas.Preload = function (options) {

          var images = {
              numLoaded: 0, // also failed are counted here
              numFailed: 0,
              numTotal: 0,
              cleanupDone: false
          },
          pageOrigin,
          methods,
          i,
          count = 0,
              element = options.elements[0] || document.body,
              doc = element.ownerDocument,
              domImages = doc.images, // TODO probably should limit it to images present in the element only
              imgLen = domImages.length,
              link = doc.createElement("a"),
              supportCORS = (function (img) {
                  return (img.crossOrigin !== undefined);
              })(new Image()),
              timeoutTimer;

          link.href = window.location.href;
          pageOrigin = link.protocol + link.host;

          function isSameOrigin(url) {
              link.href = url;
              link.href = link.href; // YES, BELIEVE IT OR NOT, that is required for IE9 - http://jsfiddle.net/niklasvh/2e48b/
              var origin = link.protocol + link.host;
              return (origin === pageOrigin);
          }

          function start() {
              h2clog("html2canvas: start: images: " + images.numLoaded + " / " + images.numTotal + " (failed: " + images.numFailed + ")");
              if (!images.firstRun && images.numLoaded >= images.numTotal) {
                  h2clog("Finished loading images: # " + images.numTotal + " (failed: " + images.numFailed + ")");

                  if (typeof options.complete === "function") {
                      options.complete(images);
                  }

              }
          }

          // TODO modify proxy to serve images with CORS enabled, where available
          function proxyGetImage(url, img, imageObj) {
              var callback_name,
              scriptUrl = options.proxy,
                  script;

              link.href = url;
              url = link.href; // work around for pages with base href="" set - WARNING: this may change the url

              callback_name = 'html2canvas_' + (count++);
              imageObj.callbackname = callback_name;

              if (scriptUrl.indexOf("?") > -1) {
                  scriptUrl += "&";
              } else {
                  scriptUrl += "?";
              }
              scriptUrl += 'url=' + encodeURIComponent(url) + '&callback=' + callback_name;
              script = doc.createElement("script");

              window[callback_name] = function (a) {
                  if (a.substring(0, 6) === "error:") {
                      imageObj.succeeded = false;
                      images.numLoaded++;
                      images.numFailed++;
                      start();
                  } else {
                      setImageLoadHandlers(img, imageObj);
                      img.src = a;
                  }
                  window[callback_name] = undefined; // to work with IE<9  // NOTE: that the undefined callback property-name still exists on the window object (for IE<9)
                  try {
                      delete window[callback_name]; // for all browser that support this
                  } catch (ex) {}
                  script.parentNode.removeChild(script);
                  script = null;
                  delete imageObj.script;
                  delete imageObj.callbackname;
              };

              script.setAttribute("type", "text/javascript");
              script.setAttribute("src", scriptUrl);
              imageObj.script = script;
              window.document.body.appendChild(script);

          }

          function loadPseudoElement(element, type) {
              var style = window.getComputedStyle(element, type),
                  content = style.content;
              if (content.substr(0, 3) === 'url') {
                  methods.loadImage(_html2canvas.Util.parseBackgroundImage(content)[0].args[0]);
              }
              loadBackgroundImages(style.backgroundImage, element);
          }

          function loadPseudoElementImages(element) {
              loadPseudoElement(element, ":before");
              loadPseudoElement(element, ":after");
          }

          function loadGradientImage(backgroundImage, bounds) {
              var img = _html2canvas.Generate.Gradient(backgroundImage, bounds);

              if (img !== undefined) {
                  images[backgroundImage] = {
                      img: img,
                      succeeded: true
                  };
                  images.numTotal++;
                  images.numLoaded++;
                  start();
              }
          }

          function invalidBackgrounds(background_image) {
              return (background_image && background_image.method && background_image.args && background_image.args.length > 0);
          }

          function loadBackgroundImages(background_image, el) {
              var bounds;

              _html2canvas.Util.parseBackgroundImage(background_image).filter(invalidBackgrounds).forEach(function (background_image) {
                  if (background_image.method === 'url') {
                      methods.loadImage(background_image.args[0]);
                  } else if (background_image.method.match(/\-?gradient$/)) {
                      if (bounds === undefined) {
                          bounds = _html2canvas.Util.Bounds(el);
                      }
                      loadGradientImage(background_image.value, bounds);
                  }
              });
          }

          function getImages(el) {
              var elNodeType = false;

              // Firefox fails with permission denied on pages with iframes
              try {
                  _html2canvas.Util.Children(el).forEach(function (img) {
                      getImages(img);
                  });
              } catch (e) {}

              try {
                  elNodeType = el.nodeType;
              } catch (ex) {
                  elNodeType = false;
                  h2clog("html2canvas: failed to access some element's nodeType - Exception: " + ex.message);
              }

              if (elNodeType === 1 || elNodeType === undefined) {
                  loadPseudoElementImages(el);
                  try {
                      loadBackgroundImages(_html2canvas.Util.getCSS(el, 'backgroundImage'), el);
                  } catch (e) {
                      h2clog("html2canvas: failed to get background-image - Exception: " + e.message);
                  }
                  loadBackgroundImages(el);
              }
          }

          function setImageLoadHandlers(img, imageObj) {
              img.onload = function () {
                  if (imageObj.timer !== undefined) {
                      // CORS succeeded
                      window.clearTimeout(imageObj.timer);
                  }

                  images.numLoaded++;
                  imageObj.succeeded = true;
                  img.onerror = img.onload = null;
                  start();
              };
              img.onerror = function () {
                  if (img.crossOrigin === "anonymous") {
                      // CORS failed
                      window.clearTimeout(imageObj.timer);

                      // let's try with proxy instead
                      if (options.proxy) {
                          var src = img.src;
                          img = new Image();
                          imageObj.img = img;
                          img.src = src;

                          proxyGetImage(img.src, img, imageObj);
                          return;
                      }
                  }

                  images.numLoaded++;
                  images.numFailed++;
                  imageObj.succeeded = false;
                  img.onerror = img.onload = null;
                  start();
              };
          }

          methods = {
              loadImage: function (src) {
                  var img, imageObj;
                  if (src && images[src] === undefined) {
                      img = new Image();
                      if (src.match(/data:image\/.*;base64,/i)) {
                          img.src = src.replace(/url\(['"]{0,}|['"]{0,}\)$/ig, '');
                          imageObj = images[src] = {
                              img: img
                          };
                          images.numTotal++;
                          setImageLoadHandlers(img, imageObj);
                      } else if (isSameOrigin(src) || options.allowTaint === true) {
                          imageObj = images[src] = {
                              img: img
                          };
                          images.numTotal++;
                          setImageLoadHandlers(img, imageObj);
                          img.src = src;
                      } else if (supportCORS && !options.allowTaint && options.useCORS) {
                          // attempt to load with CORS

                          img.crossOrigin = "anonymous";
                          imageObj = images[src] = {
                              img: img
                          };
                          images.numTotal++;
                          setImageLoadHandlers(img, imageObj);
                          img.src = src;

                          // work around for https://bugs.webkit.org/show_bug.cgi?id=80028
                          img.customComplete = function () {
                              if (!this.img.complete) {
                                  this.timer = window.setTimeout(this.img.customComplete, 100);
                              } else {
                                  this.img.onerror();
                              }
                          }.bind(imageObj);
                          img.customComplete();

                      } else if (options.proxy) {
                          imageObj = images[src] = {
                              img: img
                          };
                          images.numTotal++;
                          proxyGetImage(src, img, imageObj);
                      }
                  }

              },
              cleanupDOM: function (cause) {
                  var img, src;
                  if (!images.cleanupDone) {
                      if (cause && typeof cause === "string") {
                          h2clog("html2canvas: Cleanup because: " + cause);
                      } else {
                          h2clog("html2canvas: Cleanup after timeout: " + options.timeout + " ms.");
                      }

                      for (src in images) {
                          if (images.hasOwnProperty(src)) {
                              img = images[src];
                              if (typeof img === "object" && img.callbackname && img.succeeded === undefined) {
                                  // cancel proxy image request
                                  window[img.callbackname] = undefined; // to work with IE<9  // NOTE: that the undefined callback property-name still exists on the window object (for IE<9)
                                  try {
                                      delete window[img.callbackname]; // for all browser that support this
                                  } catch (ex) {}
                                  if (img.script && img.script.parentNode) {
                                      img.script.setAttribute("src", "about:blank"); // try to cancel running request
                                      img.script.parentNode.removeChild(img.script);
                                  }
                                  images.numLoaded++;
                                  images.numFailed++;
                                  h2clog("html2canvas: Cleaned up failed img: '" + src + "' Steps: " + images.numLoaded + " / " + images.numTotal);
                              }
                          }
                      }

                      // cancel any pending requests
                      if (window.stop !== undefined) {
                          window.stop();
                      } else if (document.execCommand !== undefined) {
                          document.execCommand("Stop", false);
                      }
                      if (document.close !== undefined) {
                          document.close();
                      }
                      images.cleanupDone = true;
                      if (!(cause && typeof cause === "string")) {
                          start();
                      }
                  }
              },

              renderingDone: function () {
                  if (timeoutTimer) {
                      window.clearTimeout(timeoutTimer);
                  }
              }
          };

          if (options.timeout > 0) {
              timeoutTimer = window.setTimeout(methods.cleanupDOM, options.timeout);
          }

          h2clog('html2canvas: Preload starts: finding background-images');
          images.firstRun = true;

          getImages(element);

          h2clog('html2canvas: Preload: Finding images');
          // load <img> images
          for (i = 0; i < imgLen; i += 1) {
              methods.loadImage(domImages[i].getAttribute("src"));
          }

          images.firstRun = false;
          h2clog('html2canvas: Preload: Done.');
          if (images.numTotal === images.numLoaded) {
              start();
          }

          return methods;

      };
      _html2canvas.Renderer = function (parseQueue, options) {

          function createRenderQueue(parseQueue) {
              var queue = [];

              var sortZ = function (zStack) {
                  var subStacks = [],
                      stackValues = [];

                  zStack.children.forEach(function (stackChild) {
                      if (stackChild.children && stackChild.children.length > 0) {
                          subStacks.push(stackChild);
                          stackValues.push(stackChild.zindex);
                      } else {
                          queue.push(stackChild);
                      }
                  });

                  stackValues.sort(function (a, b) {
                      return a - b;
                  });

                  stackValues.forEach(function (zValue) {
                      var index;

                      subStacks.some(function (stack, i) {
                          index = i;
                          return (stack.zindex === zValue);
                      });
                      sortZ(subStacks.splice(index, 1)[0]);

                  });
              };

              sortZ(parseQueue.zIndex);

              return queue;
          }

          function getRenderer(rendererName) {
              var renderer;

              if (typeof options.renderer === "string" && _html2canvas.Renderer[rendererName] !== undefined) {
                  renderer = _html2canvas.Renderer[rendererName](options);
              } else if (typeof rendererName === "function") {
                  renderer = rendererName(options);
              } else {
                  throw new Error("Unknown renderer");
              }

              if (typeof renderer !== "function") {
                  throw new Error("Invalid renderer defined");
              }
              return renderer;
          }

          return getRenderer(options.renderer)(parseQueue, options, document, createRenderQueue(parseQueue), _html2canvas);
      };

      _html2canvas.Util.Support = function (options, doc) {

          function supportSVGRendering() {
              var img = new Image(),
                  canvas = doc.createElement("canvas"),
                  ctx = (canvas.getContext === undefined) ? false : canvas.getContext("2d");
              if (ctx === false) {
                  return false;
              }
              canvas.width = canvas.height = 10;
              img.src = [
                  "data:image/svg+xml,",
                  "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'>",
                  "<foreignObject width='10' height='10'>",
                  "<div xmlns='http://www.w3.org/1999/xhtml' style='width:10;height:10;'>",
                  "sup",
                  "</div>",
                  "</foreignObject>",
                  "</svg>"].join("");
              try {
                  ctx.drawImage(img, 0, 0);
                  canvas.toDataURL();
              } catch (e) {
                  return false;
              }
              h2clog('html2canvas: Parse: SVG powered rendering available');
              return true;
          }

          // Test whether we can use ranges to measure bounding boxes
          // Opera doesn't provide valid bounds.height/bottom even though it supports the method.

          function supportRangeBounds() {
              var r, testElement, rangeBounds, rangeHeight, support = false;

              if (doc.createRange) {
                  r = doc.createRange();
                  if (r.getBoundingClientRect) {
                      testElement = doc.createElement('boundtest');
                      testElement.style.height = "123px";
                      testElement.style.display = "block";
                      doc.body.appendChild(testElement);

                      r.selectNode(testElement);
                      rangeBounds = r.getBoundingClientRect();
                      rangeHeight = rangeBounds.height;

                      if (rangeHeight === 123) {
                          support = true;
                      }
                      doc.body.removeChild(testElement);
                  }
              }

              return support;
          }

          return {
              rangeBounds: supportRangeBounds(),
              svgRendering: options.svgRendering && supportSVGRendering()
          };
      };
      window.html2canvas = function (elements, opts) {
          elements = (elements.length) ? elements : [elements];
          var queue,
          canvas,
          options = {
              // general
              logging: false,
              elements: elements,
              background: "#fff",

              // preload options
              proxy: null,
              timeout: 0, // no timeout
              useCORS: false, // try to load images as CORS (where available), before falling back to proxy
              allowTaint: false, // whether to allow images to taint the canvas, won't need proxy if set to true

              // parse options
              svgRendering: false, // use svg powered rendering where available (FF11+)
              ignoreElements: "IFRAME|OBJECT|PARAM",
              useOverflow: true,
              letterRendering: false,
              chinese: false,

              // render options

              width: null,
              height: null,
              taintTest: true, // do a taint test with all images before applying to canvas
              renderer: "Canvas"
          };

          options = _html2canvas.Util.Extend(opts, options);

          _html2canvas.logging = options.logging;
          options.complete = function (images) {

              if (typeof options.onpreloaded === "function") {
                  if (options.onpreloaded(images) === false) {
                      return;
                  }
              }
              queue = _html2canvas.Parse(images, options);

              if (typeof options.onparsed === "function") {
                  if (options.onparsed(queue) === false) {
                      return;
                  }
              }

              canvas = _html2canvas.Renderer(queue, options);

              if (typeof options.onrendered === "function") {
                  options.onrendered(canvas);
              }


          };

          // for pages without images, we still want this to be async, i.e. return methods before executing
          window.setTimeout(function () {
              _html2canvas.Preload(options);
          }, 0);

          return {
              render: function (queue, opts) {
                  return _html2canvas.Renderer(queue, _html2canvas.Util.Extend(opts, options));
              },
              parse: function (images, opts) {
                  return _html2canvas.Parse(images, _html2canvas.Util.Extend(opts, options));
              },
              preload: function (opts) {
                  return _html2canvas.Preload(_html2canvas.Util.Extend(opts, options));
              },
              log: h2clog
          };
      };

      window.html2canvas.log = h2clog; // for renderers
      window.html2canvas.Renderer = {
          Canvas: undefined // We are assuming this will be used
      };
      _html2canvas.Renderer.Canvas = function (options) {

          options = options || {};

          var doc = document,
              safeImages = [],
              testCanvas = document.createElement("canvas"),
              testctx = testCanvas.getContext("2d"),
              canvas = options.canvas || doc.createElement('canvas');


          function createShape(ctx, args) {
              ctx.beginPath();
              args.forEach(function (arg) {
                  ctx[arg.name].apply(ctx, arg['arguments']);
              });
              ctx.closePath();
          }

          function safeImage(item) {
              if (safeImages.indexOf(item['arguments'][0].src) === -1) {
                  testctx.drawImage(item['arguments'][0], 0, 0);
                  try {
                      testctx.getImageData(0, 0, 1, 1);
                  } catch (e) {
                      testCanvas = doc.createElement("canvas");
                      testctx = testCanvas.getContext("2d");
                      return false;
                  }
                  safeImages.push(item['arguments'][0].src);
              }
              return true;
          }

          function isTransparent(backgroundColor) {
              return (backgroundColor === "transparent" || backgroundColor === "rgba(0, 0, 0, 0)");
          }

          function renderItem(ctx, item) {
              switch (item.type) {
                  case "variable":
                      ctx[item.name] = item['arguments'];
                      break;
                  case "function":
                      if (item.name === "createPattern") {
                          if (item['arguments'][0].width > 0 && item['arguments'][0].height > 0) {
                              try {
                                  ctx.fillStyle = ctx.createPattern(item['arguments'][0], "repeat");
                              } catch (e) {
                                  h2clog("html2canvas: Renderer: Error creating pattern", e.message);
                              }
                          }
                      } else if (item.name === "drawShape") {
                          createShape(ctx, item['arguments']);
                      } else if (item.name === "drawImage") {
                          if (item['arguments'][8] > 0 && item['arguments'][7] > 0) {
                              if (!options.taintTest || (options.taintTest && safeImage(item))) {
                                  ctx.drawImage.apply(ctx, item['arguments']);
                              }
                          }
                      } else {
                          ctx[item.name].apply(ctx, item['arguments']);
                      }
                      break;
              }
          }

          return function (zStack, options, doc, queue, _html2canvas) {

              var ctx = canvas.getContext("2d"),
                  storageContext,
                  i,
                  queueLen,
                  newCanvas,
                  bounds,
                  fstyle;

              canvas.width = canvas.style.width = options.width || zStack.ctx.width;
              canvas.height = canvas.style.height = options.height || zStack.ctx.height;

              fstyle = ctx.fillStyle;
              ctx.fillStyle = (isTransparent(zStack.backgroundColor) && options.background !== undefined) ? options.background : zStack.backgroundColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = fstyle;


              if (options.svgRendering && zStack.svgRender !== undefined) {
                  // TODO: enable async rendering to support this
                  ctx.drawImage(zStack.svgRender, 0, 0);
              } else {
                  for (i = 0, queueLen = queue.length; i < queueLen; i += 1) {
                      storageContext = queue.splice(0, 1)[0];
                      storageContext.canvasPosition = storageContext.canvasPosition || {};

                      // set common settings for canvas
                      ctx.textBaseline = "bottom";

                      if (storageContext.clip) {
                          ctx.save();
                          ctx.beginPath();
                          // console.log(storageContext);
                          ctx.rect(storageContext.clip.left, storageContext.clip.top, storageContext.clip.width, storageContext.clip.height);
                          ctx.clip();
                      }

                      if (storageContext.ctx.storage) {
                          storageContext.ctx.storage.forEach(renderItem.bind(null, ctx));
                      }

                      if (storageContext.clip) {
                          ctx.restore();
                      }
                  }
              }

              h2clog("html2canvas: Renderer: Canvas renderer done - returning canvas obj");

              queueLen = options.elements.length;

              if (queueLen === 1) {
                  if (typeof options.elements[0] === "object" && options.elements[0].nodeName !== "BODY") {
                      // crop image to the bounds of selected (single) element
                      bounds = _html2canvas.Util.Bounds(options.elements[0]);
                      newCanvas = doc.createElement('canvas');
                      newCanvas.width = bounds.width;
                      newCanvas.height = bounds.height;
                      ctx = newCanvas.getContext("2d");

                      ctx.drawImage(canvas, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
                      canvas = null;
                      return newCanvas;
                  }
              }

              return canvas;
          };
      };
  })(window, document);








  (function( $ ){
  $.fn.qrcode = function(options) {
    // if options is string,
    if( typeof options === 'string' ){
      options = { text: options };
    }

    // set default values
    // typeNumber < 1 for automatic calculation
    options = $.extend( {}, {
      render    : "canvas",
      width   : 256,
      height    : 256,
      typeNumber  : -1,
      correctLevel  : QRErrorCorrectLevel.H,
                        background      : "#ffffff",
                        foreground      : "#000000"
    }, options);

    var createCanvas  = function(){
      // create the qrcode itself
      var qrcode  = new QRCode(options.typeNumber, options.correctLevel);
      qrcode.addData(options.text);
      qrcode.make();

      // create canvas element
      var canvas  = document.createElement('canvas');
      canvas.width  = options.width;
      canvas.height = options.height;
      var ctx   = canvas.getContext('2d');

      // compute tileW/tileH based on options.width/options.height
      var tileW = options.width  / qrcode.getModuleCount();
      var tileH = options.height / qrcode.getModuleCount();

      // draw in the canvas
      for( var row = 0; row < qrcode.getModuleCount(); row++ ){
        for( var col = 0; col < qrcode.getModuleCount(); col++ ){
          ctx.fillStyle = qrcode.isDark(row, col) ? options.foreground : options.background;
          var w = (Math.ceil((col+1)*tileW) - Math.floor(col*tileW));
          var h = (Math.ceil((row+1)*tileW) - Math.floor(row*tileW));
          ctx.fillRect(Math.round(col*tileW),Math.round(row*tileH), w, h);
        }
      }
      // return just built canvas
      return canvas;
    };

    // from Jon-Carlos Rivera (https://github.com/imbcmdth)
    var createTable = function(){
      // create the qrcode itself
      var qrcode  = new QRCode(options.typeNumber, options.correctLevel);
      qrcode.addData(options.text);
      qrcode.make();

      // create table element
      var $table  = $('<table></table>')
        .css("width", options.width+"px")
        .css("height", options.height+"px")
        .css("border", "0px")
        .css("border-collapse", "collapse")
        .css('background-color', options.background);

      // compute tileS percentage
      var tileW = options.width / qrcode.getModuleCount();
      var tileH = options.height / qrcode.getModuleCount();

      // draw in the table
      for(var row = 0; row < qrcode.getModuleCount(); row++ ){
        var $row = $('<tr></tr>').css('height', tileH+"px").appendTo($table);

        for(var col = 0; col < qrcode.getModuleCount(); col++ ){
          $('<td></td>')
            .css('width', tileW+"px")
            .css('background-color', qrcode.isDark(row, col) ? options.foreground : options.background)
            .appendTo($row);
        }
      }
      // return just built canvas
      return $table;
    }


    return this.each(function(){
      var element = options.render == "canvas" ? createCanvas() : createTable();
      $(element).appendTo(this);
    });
  };
})( jQuery );








//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

//---------------------------------------------------------------------
// QR8bitByte
//---------------------------------------------------------------------

function QR8bitByte(data) {
  this.mode = QRMode.MODE_8BIT_BYTE;
  this.data = data;
}

QR8bitByte.prototype = {

  getLength : function(buffer) {
    return this.data.length;
  },

  write : function(buffer) {
    for (var i = 0; i < this.data.length; i++) {
      // not JIS ...
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
};

//---------------------------------------------------------------------
// QRCode
//---------------------------------------------------------------------

function QRCode(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = new Array();
}

QRCode.prototype = {

  addData : function(data) {
    var newData = new QR8bitByte(data);
    this.dataList.push(newData);
    this.dataCache = null;
  },

  isDark : function(row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return this.modules[row][col];
  },

  getModuleCount : function() {
    return this.moduleCount;
  },

  make : function() {
    // Calculate automatically typeNumber if provided is < 1
    if (this.typeNumber < 1 ){
      var typeNumber = 1;
      for (typeNumber = 1; typeNumber < 40; typeNumber++) {
        var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

        var buffer = new QRBitBuffer();
        var totalDataCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }

        for (var i = 0; i < this.dataList.length; i++) {
          var data = this.dataList[i];
          buffer.put(data.mode, 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
          data.write(buffer);
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8)
          break;
      }
      this.typeNumber = typeNumber;
    }
    this.makeImpl(false, this.getBestMaskPattern() );
  },

  makeImpl : function(test, maskPattern) {

    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);

    for (var row = 0; row < this.moduleCount; row++) {

      this.modules[row] = new Array(this.moduleCount);

      for (var col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null;//(col + row) % 3;
      }
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (this.dataCache == null) {
      this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }

    this.mapData(this.dataCache, maskPattern);
  },

  setupPositionProbePattern : function(row, col)  {

    for (var r = -1; r <= 7; r++) {

      if (row + r <= -1 || this.moduleCount <= row + r) continue;

      for (var c = -1; c <= 7; c++) {

        if (col + c <= -1 || this.moduleCount <= col + c) continue;

        if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
            || (0 <= c && c <= 6 && (r == 0 || r == 6) )
            || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  },

  getBestMaskPattern : function() {

    var minLostPoint = 0;
    var pattern = 0;

    for (var i = 0; i < 8; i++) {

      this.makeImpl(true, i);

      var lostPoint = QRUtil.getLostPoint(this);

      if (i == 0 || minLostPoint >  lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  },

  createMovieClip : function(target_mc, instance_name, depth) {

    var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
    var cs = 1;

    this.make();

    for (var row = 0; row < this.modules.length; row++) {

      var y = row * cs;

      for (var col = 0; col < this.modules[row].length; col++) {

        var x = col * cs;
        var dark = this.modules[row][col];

        if (dark) {
          qr_mc.beginFill(0, 100);
          qr_mc.moveTo(x, y);
          qr_mc.lineTo(x + cs, y);
          qr_mc.lineTo(x + cs, y + cs);
          qr_mc.lineTo(x, y + cs);
          qr_mc.endFill();
        }
      }
    }

    return qr_mc;
  },

  setupTimingPattern : function() {

    for (var r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) {
        continue;
      }
      this.modules[r][6] = (r % 2 == 0);
    }

    for (var c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) {
        continue;
      }
      this.modules[6][c] = (c % 2 == 0);
    }
  },

  setupPositionAdjustPattern : function() {

    var pos = QRUtil.getPatternPosition(this.typeNumber);

    for (var i = 0; i < pos.length; i++) {

      for (var j = 0; j < pos.length; j++) {

        var row = pos[i];
        var col = pos[j];

        if (this.modules[row][col] != null) {
          continue;
        }

        for (var r = -2; r <= 2; r++) {

          for (var c = -2; c <= 2; c++) {

            if (r == -2 || r == 2 || c == -2 || c == 2
                || (r == 0 && c == 0) ) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  },

  setupTypeNumber : function(test) {

    var bits = QRUtil.getBCHTypeNumber(this.typeNumber);

    for (var i = 0; i < 18; i++) {
      var mod = (!test && ( (bits >> i) & 1) == 1);
      this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    }

    for (var i = 0; i < 18; i++) {
      var mod = (!test && ( (bits >> i) & 1) == 1);
      this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  },

  setupTypeInfo : function(test, maskPattern) {

    var data = (this.errorCorrectLevel << 3) | maskPattern;
    var bits = QRUtil.getBCHTypeInfo(data);

    // vertical
    for (var i = 0; i < 15; i++) {

      var mod = (!test && ( (bits >> i) & 1) == 1);

      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (var i = 0; i < 15; i++) {

      var mod = (!test && ( (bits >> i) & 1) == 1);

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    // fixed module
    this.modules[this.moduleCount - 8][8] = (!test);

  },

  mapData : function(data, maskPattern) {

    var inc = -1;
    var row = this.moduleCount - 1;
    var bitIndex = 7;
    var byteIndex = 0;

    for (var col = this.moduleCount - 1; col > 0; col -= 2) {

      if (col == 6) col--;

      while (true) {

        for (var c = 0; c < 2; c++) {

          if (this.modules[row][col - c] == null) {

            var dark = false;

            if (byteIndex < data.length) {
              dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
            }

            var mask = QRUtil.getMask(maskPattern, row, col - c);

            if (mask) {
              dark = !dark;
            }

            this.modules[row][col - c] = dark;
            bitIndex--;

            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }

  }

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {

  var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

  var buffer = new QRBitBuffer();

  for (var i = 0; i < dataList.length; i++) {
    var data = dataList[i];
    buffer.put(data.mode, 4);
    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
    data.write(buffer);
  }

  // calc num max data.
  var totalDataCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) {
    totalDataCount += rsBlocks[i].dataCount;
  }

  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error("code length overflow. ("
      + buffer.getLengthInBits()
      + ">"
      +  totalDataCount * 8
      + ")");
  }

  // end code
  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
    buffer.put(0, 4);
  }

  // padding
  while (buffer.getLengthInBits() % 8 != 0) {
    buffer.putBit(false);
  }

  // padding
  while (true) {

    if (buffer.getLengthInBits() >= totalDataCount * 8) {
      break;
    }
    buffer.put(QRCode.PAD0, 8);

    if (buffer.getLengthInBits() >= totalDataCount * 8) {
      break;
    }
    buffer.put(QRCode.PAD1, 8);
  }

  return QRCode.createBytes(buffer, rsBlocks);
}

QRCode.createBytes = function(buffer, rsBlocks) {

  var offset = 0;

  var maxDcCount = 0;
  var maxEcCount = 0;

  var dcdata = new Array(rsBlocks.length);
  var ecdata = new Array(rsBlocks.length);

  for (var r = 0; r < rsBlocks.length; r++) {

    var dcCount = rsBlocks[r].dataCount;
    var ecCount = rsBlocks[r].totalCount - dcCount;

    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);

    dcdata[r] = new Array(dcCount);

    for (var i = 0; i < dcdata[r].length; i++) {
      dcdata[r][i] = 0xff & buffer.buffer[i + offset];
    }
    offset += dcCount;

    var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
    var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

    var modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.getLength() - 1);
    for (var i = 0; i < ecdata[r].length; i++) {
            var modIndex = i + modPoly.getLength() - ecdata[r].length;
      ecdata[r][i] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
    }

  }

  var totalCodeCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) {
    totalCodeCount += rsBlocks[i].totalCount;
  }

  var data = new Array(totalCodeCount);
  var index = 0;

  for (var i = 0; i < maxDcCount; i++) {
    for (var r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) {
        data[index++] = dcdata[r][i];
      }
    }
  }

  for (var i = 0; i < maxEcCount; i++) {
    for (var r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) {
        data[index++] = ecdata[r][i];
      }
    }
  }

  return data;

}

//---------------------------------------------------------------------
// QRMode
//---------------------------------------------------------------------

var QRMode = {
  MODE_NUMBER :   1 << 0,
  MODE_ALPHA_NUM :  1 << 1,
  MODE_8BIT_BYTE :  1 << 2,
  MODE_KANJI :    1 << 3
};

//---------------------------------------------------------------------
// QRErrorCorrectLevel
//---------------------------------------------------------------------

var QRErrorCorrectLevel = {
  L : 1,
  M : 0,
  Q : 3,
  H : 2
};

//---------------------------------------------------------------------
// QRMaskPattern
//---------------------------------------------------------------------

var QRMaskPattern = {
  PATTERN000 : 0,
  PATTERN001 : 1,
  PATTERN010 : 2,
  PATTERN011 : 3,
  PATTERN100 : 4,
  PATTERN101 : 5,
  PATTERN110 : 6,
  PATTERN111 : 7
};

//---------------------------------------------------------------------
// QRUtil
//---------------------------------------------------------------------

var QRUtil = {

    PATTERN_POSITION_TABLE : [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)  | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );
      }
      return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
      var d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );
      }
      return (data << 12) | d;
    },

    getBCHDigit : function(data) {

      var digit = 0;

      while (data != 0) {
        digit++;
        data >>>= 1;
      }

      return digit;
    },

    getPatternPosition : function(typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 : return (i + j) % 2 == 0;
      case QRMaskPattern.PATTERN001 : return i % 2 == 0;
      case QRMaskPattern.PATTERN010 : return j % 3 == 0;
      case QRMaskPattern.PATTERN011 : return (i + j) % 3 == 0;
      case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0;
      case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 == 0;
      case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 == 0;
      case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 == 0;

      default :
        throw new Error("bad maskPattern:" + maskPattern);
      }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

      var a = new QRPolynomial([1], 0);

      for (var i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
      }

      return a;
    },

    getLengthInBits : function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER   : return 10;
        case QRMode.MODE_ALPHA_NUM  : return 9;
        case QRMode.MODE_8BIT_BYTE  : return 8;
        case QRMode.MODE_KANJI    : return 8;
        default :
          throw new Error("mode:" + mode);
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER   : return 12;
        case QRMode.MODE_ALPHA_NUM  : return 11;
        case QRMode.MODE_8BIT_BYTE  : return 16;
        case QRMode.MODE_KANJI    : return 10;
        default :
          throw new Error("mode:" + mode);
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER   : return 14;
        case QRMode.MODE_ALPHA_NUM  : return 13;
        case QRMode.MODE_8BIT_BYTE  : return 16;
        case QRMode.MODE_KANJI    : return 12;
        default :
          throw new Error("mode:" + mode);
        }

      } else {
        throw new Error("type:" + type);
      }
    },

    getLostPoint : function(qrCode) {

      var moduleCount = qrCode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row++) {

        for (var col = 0; col < moduleCount; col++) {

          var sameCount = 0;
          var dark = qrCode.isDark(row, col);

        for (var r = -1; r <= 1; r++) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c++) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrCode.isDark(row + r, col + c) ) {
                sameCount++;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      }

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row++) {
        for (var col = 0; col < moduleCount - 1; col++) {
          var count = 0;
          if (qrCode.isDark(row,     col    ) ) count++;
          if (qrCode.isDark(row + 1, col    ) ) count++;
          if (qrCode.isDark(row,     col + 1) ) count++;
          if (qrCode.isDark(row + 1, col + 1) ) count++;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount - 6; col++) {
          if (qrCode.isDark(row, col)
              && !qrCode.isDark(row, col + 1)
              &&  qrCode.isDark(row, col + 2)
              &&  qrCode.isDark(row, col + 3)
              &&  qrCode.isDark(row, col + 4)
              && !qrCode.isDark(row, col + 5)
              &&  qrCode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount - 6; row++) {
          if (qrCode.isDark(row, col)
              && !qrCode.isDark(row + 1, col)
              &&  qrCode.isDark(row + 2, col)
              &&  qrCode.isDark(row + 3, col)
              &&  qrCode.isDark(row + 4, col)
              && !qrCode.isDark(row + 5, col)
              &&  qrCode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount; row++) {
          if (qrCode.isDark(row, col) ) {
            darkCount++;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    }

};


//---------------------------------------------------------------------
// QRMath
//---------------------------------------------------------------------

var QRMath = {

  glog : function(n) {

    if (n < 1) {
      throw new Error("glog(" + n + ")");
    }

    return QRMath.LOG_TABLE[n];
  },

  gexp : function(n) {

    while (n < 0) {
      n += 255;
    }

    while (n >= 256) {
      n -= 255;
    }

    return QRMath.EXP_TABLE[n];
  },

  EXP_TABLE : new Array(256),

  LOG_TABLE : new Array(256)

};

for (var i = 0; i < 8; i++) {
  QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
  QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
    ^ QRMath.EXP_TABLE[i - 5]
    ^ QRMath.EXP_TABLE[i - 6]
    ^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
  QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

//---------------------------------------------------------------------
// QRPolynomial
//---------------------------------------------------------------------

function QRPolynomial(num, shift) {

  if (num.length == undefined) {
    throw new Error(num.length + "/" + shift);
  }

  var offset = 0;

  while (offset < num.length && num[offset] == 0) {
    offset++;
  }

  this.num = new Array(num.length - offset + shift);
  for (var i = 0; i < num.length - offset; i++) {
    this.num[i] = num[i + offset];
  }
}

QRPolynomial.prototype = {

  get : function(index) {
    return this.num[index];
  },

  getLength : function() {
    return this.num.length;
  },

  multiply : function(e) {

    var num = new Array(this.getLength() + e.getLength() - 1);

    for (var i = 0; i < this.getLength(); i++) {
      for (var j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
      }
    }

    return new QRPolynomial(num, 0);
  },

  mod : function(e) {

    if (this.getLength() - e.getLength() < 0) {
      return this;
    }

    var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );

    var num = new Array(this.getLength() );

    for (var i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }

    for (var i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i) ) + ratio);
    }

    // recursive call
    return new QRPolynomial(num, 0).mod(e);
  }
};

//---------------------------------------------------------------------
// QRRSBlock
//---------------------------------------------------------------------

function QRRSBlock(totalCount, dataCount) {
  this.totalCount = totalCount;
  this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

  // L
  // M
  // Q
  // H

  // 1
  [1, 26, 19],
  [1, 26, 16],
  [1, 26, 13],
  [1, 26, 9],

  // 2
  [1, 44, 34],
  [1, 44, 28],
  [1, 44, 22],
  [1, 44, 16],

  // 3
  [1, 70, 55],
  [1, 70, 44],
  [2, 35, 17],
  [2, 35, 13],

  // 4
  [1, 100, 80],
  [2, 50, 32],
  [2, 50, 24],
  [4, 25, 9],

  // 5
  [1, 134, 108],
  [2, 67, 43],
  [2, 33, 15, 2, 34, 16],
  [2, 33, 11, 2, 34, 12],

  // 6
  [2, 86, 68],
  [4, 43, 27],
  [4, 43, 19],
  [4, 43, 15],

  // 7
  [2, 98, 78],
  [4, 49, 31],
  [2, 32, 14, 4, 33, 15],
  [4, 39, 13, 1, 40, 14],

  // 8
  [2, 121, 97],
  [2, 60, 38, 2, 61, 39],
  [4, 40, 18, 2, 41, 19],
  [4, 40, 14, 2, 41, 15],

  // 9
  [2, 146, 116],
  [3, 58, 36, 2, 59, 37],
  [4, 36, 16, 4, 37, 17],
  [4, 36, 12, 4, 37, 13],

  // 10
  [2, 86, 68, 2, 87, 69],
  [4, 69, 43, 1, 70, 44],
  [6, 43, 19, 2, 44, 20],
  [6, 43, 15, 2, 44, 16],

  // 11
  [4, 101, 81],
  [1, 80, 50, 4, 81, 51],
  [4, 50, 22, 4, 51, 23],
  [3, 36, 12, 8, 37, 13],

  // 12
  [2, 116, 92, 2, 117, 93],
  [6, 58, 36, 2, 59, 37],
  [4, 46, 20, 6, 47, 21],
  [7, 42, 14, 4, 43, 15],

  // 13
  [4, 133, 107],
  [8, 59, 37, 1, 60, 38],
  [8, 44, 20, 4, 45, 21],
  [12, 33, 11, 4, 34, 12],

  // 14
  [3, 145, 115, 1, 146, 116],
  [4, 64, 40, 5, 65, 41],
  [11, 36, 16, 5, 37, 17],
  [11, 36, 12, 5, 37, 13],

  // 15
  [5, 109, 87, 1, 110, 88],
  [5, 65, 41, 5, 66, 42],
  [5, 54, 24, 7, 55, 25],
  [11, 36, 12],

  // 16
  [5, 122, 98, 1, 123, 99],
  [7, 73, 45, 3, 74, 46],
  [15, 43, 19, 2, 44, 20],
  [3, 45, 15, 13, 46, 16],

  // 17
  [1, 135, 107, 5, 136, 108],
  [10, 74, 46, 1, 75, 47],
  [1, 50, 22, 15, 51, 23],
  [2, 42, 14, 17, 43, 15],

  // 18
  [5, 150, 120, 1, 151, 121],
  [9, 69, 43, 4, 70, 44],
  [17, 50, 22, 1, 51, 23],
  [2, 42, 14, 19, 43, 15],

  // 19
  [3, 141, 113, 4, 142, 114],
  [3, 70, 44, 11, 71, 45],
  [17, 47, 21, 4, 48, 22],
  [9, 39, 13, 16, 40, 14],

  // 20
  [3, 135, 107, 5, 136, 108],
  [3, 67, 41, 13, 68, 42],
  [15, 54, 24, 5, 55, 25],
  [15, 43, 15, 10, 44, 16],

  // 21
  [4, 144, 116, 4, 145, 117],
  [17, 68, 42],
  [17, 50, 22, 6, 51, 23],
  [19, 46, 16, 6, 47, 17],

  // 22
  [2, 139, 111, 7, 140, 112],
  [17, 74, 46],
  [7, 54, 24, 16, 55, 25],
  [34, 37, 13],

  // 23
  [4, 151, 121, 5, 152, 122],
  [4, 75, 47, 14, 76, 48],
  [11, 54, 24, 14, 55, 25],
  [16, 45, 15, 14, 46, 16],

  // 24
  [6, 147, 117, 4, 148, 118],
  [6, 73, 45, 14, 74, 46],
  [11, 54, 24, 16, 55, 25],
  [30, 46, 16, 2, 47, 17],

  // 25
  [8, 132, 106, 4, 133, 107],
  [8, 75, 47, 13, 76, 48],
  [7, 54, 24, 22, 55, 25],
  [22, 45, 15, 13, 46, 16],

  // 26
  [10, 142, 114, 2, 143, 115],
  [19, 74, 46, 4, 75, 47],
  [28, 50, 22, 6, 51, 23],
  [33, 46, 16, 4, 47, 17],

  // 27
  [8, 152, 122, 4, 153, 123],
  [22, 73, 45, 3, 74, 46],
  [8, 53, 23, 26, 54, 24],
  [12, 45, 15, 28, 46, 16],

  // 28
  [3, 147, 117, 10, 148, 118],
  [3, 73, 45, 23, 74, 46],
  [4, 54, 24, 31, 55, 25],
  [11, 45, 15, 31, 46, 16],

  // 29
  [7, 146, 116, 7, 147, 117],
  [21, 73, 45, 7, 74, 46],
  [1, 53, 23, 37, 54, 24],
  [19, 45, 15, 26, 46, 16],

  // 30
  [5, 145, 115, 10, 146, 116],
  [19, 75, 47, 10, 76, 48],
  [15, 54, 24, 25, 55, 25],
  [23, 45, 15, 25, 46, 16],

  // 31
  [13, 145, 115, 3, 146, 116],
  [2, 74, 46, 29, 75, 47],
  [42, 54, 24, 1, 55, 25],
  [23, 45, 15, 28, 46, 16],

  // 32
  [17, 145, 115],
  [10, 74, 46, 23, 75, 47],
  [10, 54, 24, 35, 55, 25],
  [19, 45, 15, 35, 46, 16],

  // 33
  [17, 145, 115, 1, 146, 116],
  [14, 74, 46, 21, 75, 47],
  [29, 54, 24, 19, 55, 25],
  [11, 45, 15, 46, 46, 16],

  // 34
  [13, 145, 115, 6, 146, 116],
  [14, 74, 46, 23, 75, 47],
  [44, 54, 24, 7, 55, 25],
  [59, 46, 16, 1, 47, 17],

  // 35
  [12, 151, 121, 7, 152, 122],
  [12, 75, 47, 26, 76, 48],
  [39, 54, 24, 14, 55, 25],
  [22, 45, 15, 41, 46, 16],

  // 36
  [6, 151, 121, 14, 152, 122],
  [6, 75, 47, 34, 76, 48],
  [46, 54, 24, 10, 55, 25],
  [2, 45, 15, 64, 46, 16],

  // 37
  [17, 152, 122, 4, 153, 123],
  [29, 74, 46, 14, 75, 47],
  [49, 54, 24, 10, 55, 25],
  [24, 45, 15, 46, 46, 16],

  // 38
  [4, 152, 122, 18, 153, 123],
  [13, 74, 46, 32, 75, 47],
  [48, 54, 24, 14, 55, 25],
  [42, 45, 15, 32, 46, 16],

  // 39
  [20, 147, 117, 4, 148, 118],
  [40, 75, 47, 7, 76, 48],
  [43, 54, 24, 22, 55, 25],
  [10, 45, 15, 67, 46, 16],

  // 40
  [19, 148, 118, 6, 149, 119],
  [18, 75, 47, 31, 76, 48],
  [34, 54, 24, 34, 55, 25],
  [20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {

  var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);

  if (rsBlock === undefined) {
    throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
  }

  var length = rsBlock.length / 3;

  var list = new Array();

  for (var i = 0; i < length; i++) {

    var count = rsBlock[i * 3 + 0];
    var totalCount = rsBlock[i * 3 + 1];
    var dataCount  = rsBlock[i * 3 + 2];

    for (var j = 0; j < count; j++) {
      list.push(new QRRSBlock(totalCount, dataCount) );
    }
  }

  return list;
}

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

  switch(errorCorrectLevel) {
  case QRErrorCorrectLevel.L :
    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
  case QRErrorCorrectLevel.M :
    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
  case QRErrorCorrectLevel.Q :
    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
  case QRErrorCorrectLevel.H :
    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
  default :
    return undefined;
  }
}

//---------------------------------------------------------------------
// QRBitBuffer
//---------------------------------------------------------------------

function QRBitBuffer() {
  this.buffer = new Array();
  this.length = 0;
}

QRBitBuffer.prototype = {

  get : function(index) {
    var bufIndex = Math.floor(index / 8);
    return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
  },

  put : function(num, length) {
    for (var i = 0; i < length; i++) {
      this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
    }
  },

  getLengthInBits : function() {
    return this.length;
  },

  putBit : function(bit) {

    var bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
    }

    this.length++;
  }
};



