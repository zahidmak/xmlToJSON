/* Copyright 2013 William Summers, Metatribal Research
 * adapted from https://developer.mozilla.org/en-US/docs/JXON
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author William Summers
 *
 */
var xmlToJSON = (function () {

        var options = { // set up the default options
                parseCDATA: true,	// extract cdata and merge with text
                grokAttr: true,		// convert truthy attributes to boolean, etc
                grokText: true,		// convert truthy text to boolean, etc
                normalize: true,	// collapse multiple spaces to single space
                xmlns: false, 		// include namespaces as attribute in output
                namespaceKey: 'ns', 	// tag name for namespace objects
                textKey: 'text', 	// tag name for text values
                valueKey: 'value', 	// tag name for attribute values
                attrKey: 'attr', 	// tag for attr groups
                attrsAsObject: true, 	// if false, key is used as prefix to name, set prefix to '' to merge children and attrs.
                stripAttrPrefix: true, 	// remove namespace prefixes from nodes(el and attr) (set false if you have elements with the same name in different namespaces)
                stripElemPrefix: true, 	// for elements of same name in diff prefixes, you can use the namespaceKey to determine which it is.
                childrenAsArray: true 	// force children into arrays
        };

        var prefixMatch = new RegExp(/(?!xmlns)^.*:/);
        var trimMatch = new RegExp(/^\s+|\s+$/g);

        var grokType = function (sValue) {
                if (/^\s*$/.test(sValue)) {
                        return null;
                }
                if (/^(?:true|false)$/i.test(sValue)) {
                        return sValue.toLowerCase() === "true";
                }
                if (isFinite(sValue)) {
                        return parseFloat(sValue);
                }
                //if (isFinite(Date.parse(sValue))) {
                //		return new Date(sValue);
                //}
                return sValue;
        };

        var parseString = function (xmlString, opt) {
                return this.parseXML(stringToXML(xmlString), opt);
        }

        var parseXML = function (oXMLParent, opt) {

                // initialize options
                for (key in opt) {
                        options[key] = opt[key];
                }

                var vResult = {}, nLength = 0, sCollectedTxt = "";

                // parse namespace information
                if (options.xmlns && oXMLParent.namespaceURI) {
                        vResult[options.namespaceKey] = oXMLParent.namespaceURI;
                }

                // parse attributes
                // using attributes property instead of hasAttributes method to support older browsers
                if (oXMLParent.attributes && oXMLParent.attributes.length > 0) {
                        var vAttribs = {};

                        for (nLength; nLength < oXMLParent.attributes.length; nLength++) {
                                oAttrib = oXMLParent.attributes.item(nLength);
                                vContent = {};
                                attribName = '';

                                if (options.stripAttrPrefix) {
                                        attribName = oAttrib.name.replace(prefixMatch, '');

                                } else {
                                        attribName = oAttrib.name;
                                }

                                if (options.grokAttr) {
                                        vContent[options.valueKey] = grokType(oAttrib.value.replace(trimMatch, ''));
                                } else {
                                        vContent[options.valueKey] = oAttrib.value.replace(trimMatch, '');
                                }

                                if (options.xmlns && oAttrib.namespaceURI) {
                                        vContent[options.namespaceKey] = oAttrib.namespaceURI;
                                }

                                if (options.attrsAsObject) { // attributes with same local name must enable prefixes
                                        vAttribs[attribName] = vContent;
                                } else {
                                        vResult[options.attrKey + attribName] = vContent;
                                }
                        }

                        if (options.attrsAsObject) {
                                vResult[options.attrKey] = vAttribs;
                        } else {}
                }

                // iterate over the children
                if (oXMLParent.hasChildNodes()) {
                        for (var oNode, sProp, vContent, nItem = 0; nItem < oXMLParent.childNodes.length; nItem++) {
                                oNode = oXMLParent.childNodes.item(nItem);

                                if (oNode.nodeType === 4 && options.parseCDATA) {
                                        sCollectedTxt += oNode.nodeValue;
                                } /* nodeType is "CDATASection" (4) */
                                else if (oNode.nodeType === 3) {
                                        sCollectedTxt += oNode.nodeValue;
                                } /* nodeType is "Text" (3) */
                                else if (oNode.nodeType === 1) { /* nodeType is "Element" (1) */

                                        if (nLength === 0) {
                                                vResult = {};
                                        }

                                        // using nodeName to support browser (IE) implementation with no 'localName' property
                                        if (options.stripElemPrefix) {
                                                sProp = oNode.nodeName.replace(prefixMatch, '');
                                        } else {
                                                sProp = oNode.nodeName;
                                        }

                                        vContent = parseXML(oNode);

                                        if (vResult.hasOwnProperty(sProp)) {
                                                if (vResult[sProp].constructor !== Array) {
                                                        vResult[sProp] = [vResult[sProp]];
                                                }
                                                vResult[sProp].push(vContent);

                                        } else {
                                                if (options.childrenAsArray) {
                                                        vResult[sProp] = [];
                                                        vResult[sProp].push(vContent);
                                                } else {
                                                        vResult[sProp] = vContent;
                                                }
                                                nLength++;
                                        }
                                }
                        }
                }

                if (sCollectedTxt) {
                        if (options.grokText) {
                                value = grokType(sCollectedTxt.replace(trimMatch, ''));
                                if (value) {
									vResult[options.textKey] = value;
								}
                        } else if (options.normalize) {
                                vResult[options.textKey] = sCollectedTxt.replace(trimMatch, '').replace(/\s+/g, " ");
                        } else {
                                vResult[options.textKey] = sCollectedTxt.replace(trimMatch, '');
                        }
                }

                return vResult;
        }


        // Convert xmlDocument to a string
        // Returns null on failure
        var xmlToString = function (xmlDoc) {
                try {
                        var xmlString = xmlDoc.xml ? xmlDoc.xml : (new XMLSerializer()).serializeToString(xmlDoc);
                        return xmlString;
                } catch (err) {
                        return null;
                }
        }

        // Convert a string to XML Node Structure
        // Returns null on failure
        var stringToXML = function (xmlString) {
                try {
                        var xmlDoc = null;

                        if (window.DOMParser) {

                                var parser = new DOMParser();
                                xmlDoc = parser.parseFromString(xmlString, "text/xml");

                                return xmlDoc;
                        } else {
                                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                                xmlDoc.async = false;
                                xmlDoc.loadXML(xmlString);

                                return xmlDoc;
                        }
                } catch (e) {
                        return null;
                }
        }

        // this is the "revealed"/public part of the module
        return {
                parseXML: parseXML,
                parseString: parseString,
                xmlToString: xmlToString,
                stringToXML: stringToXML
        };

}());
