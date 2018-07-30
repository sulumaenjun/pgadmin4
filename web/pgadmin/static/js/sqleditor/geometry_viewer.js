/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import Alertify from 'pgadmin.alertifyjs';
import {Geometry} from 'wkx';
import {Buffer} from 'buffer';
import BuildGeometryViewerDialog from 'sources/sqleditor/geometry_viewer_dialog';

let GeometryViewer = {
  'render_geometry': renderGeometry,

  'add_header_button': function (columnDefinition) {
    if (columnDefinition.column_type_internal === 'geometry' ||
      columnDefinition.column_type_internal === 'geography') {
      columnDefinition.header = {
        buttons: [
          {
            cssClass: 'div-view-geometry-column',
            tooltip: 'View all geometries in this column',
            showOnHover: false,
            command: 'view-all-geometries',
            content: '<button class="btn-xs btn-primary"><i class="fa fa-eye" aria-hidden="true"></i></button>',
          },
        ],
      };
    }

  },
};

function renderGeometry(items, columns, columnIndex) {
  BuildGeometryViewerDialog();
  const maxRenderByteLength = 5 * 1024 * 1024; //render geometry data up to 5MB
  let field = columns[columnIndex].field;
  let geometries3D = [],
    geometries = [],
    unsupportedItems = [],
    geometryItemMap = new Map(),
    mixedSRID = false,
    geometryTotalByteLength = 0,
    tooLargeDataSize = false;

  if (_.isUndefined(items)) {
    Alertify.alert(gettext('Geometry Viewer Error'), gettext('Empty data'));
    return;
  }

  if (!_.isArray(items)) {
    items = [items];
  }

  if (items.length === 0) {
    Alertify.alert(gettext('Geometry Viewer Error'), gettext('Empty Column'));
    return;
  }

  _.every(items, function (item) {
    try {
      let value = item[field];
      let buffer = new Buffer(value, 'hex');
      let geometry = Geometry.parse(buffer);
      if (geometry.hasZ) {
        geometries3D.push(geometry);
      } else {
        geometryTotalByteLength += buffer.byteLength;
        if (geometryTotalByteLength > maxRenderByteLength) {
          tooLargeDataSize = true;
          return false;
        }
        if (!geometry.srid) {
          geometry.srid = 0;
        }
        geometries.push(geometry);
        geometryItemMap.set(geometry, item);
      }
    } catch (e) {
      unsupportedItems.push(item);
    }
    return true;
  });

  // group geometries by SRID
  let geometriesGroupBySRID = _.groupBy(geometries, 'srid');
  let SRIDGeometriesPairs = _.pairs(geometriesGroupBySRID);
  if (SRIDGeometriesPairs.length > 1) {
    mixedSRID = true;
  }
  let selectedPair = _.max(SRIDGeometriesPairs, function (pair) {
    return pair[1].length;
  });
  let selectedSRID = selectedPair[0];
  let selectedGeometries = selectedPair[1];

  let geoJSONs = _.map(selectedGeometries, function (geometry) {
    return geometry.toGeoJSON();
  });
  let getPopupContent = function (geojson) {
    let geometry = selectedGeometries[geoJSONs.indexOf(geojson)];
    //alert(JSON.stringify(geometryItemMap.has(geometry)));
    let item = geometryItemMap.get(geometry);
    return itemToTable(item, columns);
  };

  let infoContent = [];
  if (tooLargeDataSize) {
    infoContent.push('Too Large Data Size' +
      '<i class="fa fa-question-circle" title="Due to performance limitations, just render geometry data up to 5MB." aria-hidden="true"></i>');
  }
  if (mixedSRID) {
    infoContent.push('Mixed SRID, Current SRID: ' + selectedSRID +
      '<i class="fa fa-question-circle" title="There are geometries with different SRIDs in this column." aria-hidden="true"></i>');
  }
  if (geometries3D.length > 0) {
    infoContent.push('3D geometry not rendered');
  }
  if (unsupportedItems.length > 0) {
    infoContent.push('Unsupported geometry not rendered');
  }

  Alertify.mapDialog(geoJSONs, parseInt(selectedSRID), getPopupContent, infoContent);
}

//
// function RenderGeometries(items, columns, columnIndex) {
//   BuildGeometryViewerDialog();
//   const maxRenderByteLength = 5 * 1024 * 1024; //render geometry data up to 5MB
//   let field = columns[columnIndex].field,
//     geometries3D = [],
//     geometries = [],
//     unsupportedItems = [],
//     geometryItemMap = new Map(),
//     mixedSRID = false,
//     geometryTotalByteLength = 0,
//     tooLargeDataSize = false;
//
//   if (!_.isArray(items) || items.length === 0) {
//     Alertify.alert(gettext('Geometry Viewer Error'), gettext('Empty column'));
//     return;
//   }
//
//   _.every(items, function (item) {
//     try {
//       let value = item[field];
//       let buffer = new Buffer(value, 'hex');
//       let geometry = Geometry.parse(buffer);
//       if (geometry.hasZ) {
//         geometries3D.push(geometry);
//       } else {
//         geometryTotalByteLength += buffer.byteLength;
//         if (geometryTotalByteLength > maxRenderByteLength) {
//           tooLargeDataSize = true;
//           return false;
//         }
//         if (!geometry.srid) {
//           geometry.srid = 0;
//         }
//         geometries.push(geometry);
//         geometryItemMap.set(geometry, item);
//       }
//     } catch (e) {
//       unsupportedItems.push(item);
//     }
//     return true;
//   });
//   // group geometries by SRID
//   let geometriesGroupBySRID = _.groupBy(geometries, 'srid');
//   let SRIDGeometriesPairs = _.pairs(geometriesGroupBySRID);
//   if (SRIDGeometriesPairs.length > 1) {
//     mixedSRID = true;
//   }
//   let selectedPair = _.max(SRIDGeometriesPairs, function (pair) {
//     return pair[1].length;
//   });
//   let selectedSRID = selectedPair[0];
//   let selectedGeometries = selectedPair[1];
//   let geoJSONs = _.map(selectedPair[1], function (geometry) {
//     return geometry.toGeoJSON();
//   });
//
//   let getPopupContent = function (geojson) {
//     let geometry = selectedGeometries[geoJSONs.indexOf(geojson)];
//     //alert(JSON.stringify(geometryItemMap.has(geometry)));
//     let item = geometryItemMap.get(geometry);
//     return itemToTable(item, columns);
//   };
//
//   let infoContent = [];
//   if (tooLargeDataSize) {
//     infoContent.push('Too Large Data Size' +
//       '<i class="fa fa-question-circle" title="Due to performance limitations, just render geometry data up to 5MB." aria-hidden="true"></i>');
//   }
//   if (mixedSRID) {
//     infoContent.push('Mixed SRID, Current SRID: ' + selectedSRID +
//       '<i class="fa fa-question-circle" title="There are geometries with different SRIDs in this column." aria-hidden="true"></i>');
//   }
//   if (geometries3D.length > 0) {
//     infoContent.push('3D geometry not rendered');
//   }
//   if (unsupportedItems.length > 0) {
//     infoContent.push('Unsupported geometry not rendered');
//   }
//
//   Alertify.mapDialog(geoJSONs, parseInt(selectedSRID), getPopupContent, infoContent);
// }
//
// function renderSingleGeometry(item, columns, columnIndex) {
//   BuildGeometryViewerDialog();
//
//   let value = item[columns[columnIndex].field];
//   let geometry;
//   try {
//     let buffer = new Buffer(value, 'hex');
//     geometry = Geometry.parse(buffer);
//   } catch (e) {
//     Alertify.alert(gettext('Geometry Viewer Error'), gettext('Can not render geometry of this type'));
//     return;
//   }
//
//   if (geometry.hasZ) {
//     Alertify.alert(gettext('Geometry Viewer Error'), gettext('Can not render 3d geometry'));
//   } else {
//     let geojson = geometry.toGeoJSON();
//     let getPopupContent = function () {
//       //alert(JSON.stringify(geojson == geojson));
//       return itemToTable(item, columns);
//     };
//     Alertify.mapDialog(geojson, geometry.srid, getPopupContent);
//   }
// }

function itemToTable(item, columns) {
  let content = '<table class="table table-bordered table-striped view-geometry-property-table"><tbody>';
  _.each(columns, function (columnDef) {
    if (!_.isUndefined(columnDef.display_name)) {
      content += '<tr><th>' + columnDef.display_name + '</th>' + '<td>';

      let value = item[columnDef.field];
      if (_.isUndefined(value) && columnDef.has_default_val) {
        content += '<i>[default]</i>';
      } else if (
        (_.isUndefined(value) && columnDef.not_null) ||
        (_.isUndefined(value) || value === null)
      ) {
        content += '<i>[null]</i>';
      } else {
        content += value;
      }
      content += '</td></tr>';
    }
  });
  content += '</tbody></table>';
  return content;
}

module.exports = GeometryViewer;