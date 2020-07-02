import {Edge, FaceInfo, FacesEdge, MM, Vertex} from "./Myriahedral";

enum QuadDirection {
  Left,
  Right,
  Top,
  Down,
}

export enum GraticuleType {
  Cylindrical,
  Conical,
  Azimutal,
  AzimutalTwoHemispheres,
  Polyconical
}

export interface GraticuleParams {
  type: GraticuleType;
  parallels: number;
}

export class Graticule {

  vertices: Vertex[] = [];
  faces = new Map<number, FaceInfo>();
  folds: FacesEdge[] = [];
  root: FacesEdge;

  connectedQuads = new MM<FacesEdge>();

  constructor(readonly parallels: number) {

  }

  build() {
    this.buildVerticesAndFaces();
    this.setEdgesFaceIndices();
    this.connectGraticuleAzimutalTwoHemispheres();
    this.filterOutInvalidFaces();
    return this;
  }

  private filterOutInvalidFaces() {
    this.folds = this.folds.filter(f => {
      return f.fromFaceIndex !== null && f.toFaceIndex !== null;
    });
  }

  private connectGraticuleCylindrical() {
    this.connectGraticuleCylindricalOrConical((this.parallels / 2) | 0, this.parallels);
  }

  private connectGraticuleConical() {
    this.connectGraticuleCylindricalOrConical((this.parallels / 3) | 0, this.parallels);
  }

  private connectGraticuleCylindricalOrConical(row: number, col: number ) {


    this.startFoldsConnections(row, col);

    for (let j = 0; j <= this.parallels; j++) {
      this.connectQuadByDirection(row, col-j, QuadDirection.Left);
      this.connectQuadByDirection(row, col+j, QuadDirection.Right);
    }

    for (let i = 0; i < row; i++) {
      for (let j = 0; j < this.parallels * 2; j++) {
        this.connectQuadByDirection(row - i, j, QuadDirection.Top);
      }
    }

    const t1 = this.parallels - row;
    for (let i = 0; i < t1; i++) {
      for (let j = 0; j < this.parallels * 2; j++) {
        this.connectQuadByDirection( row + i, j, QuadDirection.Down);
      }
    }

    this.root.parent = null;
  }

  private connectGraticuleAzimutalTwoHemispheres() {
    const mid = (this.parallels / 2)|0;

    this.startFoldsConnections(mid, 0);

    for (let i = 0; i < 2 * this.parallels - 1; i++) {
      this.connectQuadByDirection(0, i, QuadDirection.Right);
      this.connectQuadByDirection(this.parallels - 1, i, QuadDirection.Right);
    }

    for (let i = 0; i < mid; i++) {
      for (let j = 0; j < this.parallels * 2; j++) {
        this.connectQuadByDirection(mid - i - 1, j, QuadDirection.Top);
        this.connectQuadByDirection( mid + i, j, QuadDirection.Down);
      }
    }

    for (let j = 0; j < this.parallels * 2; j++) {
      this.connectQuad(mid, j);
      this.connectQuad(mid - 1, j);
    }

    this.connectQuadByDirection(mid, 0, QuadDirection.Top);

    this.root.parent = null;
  }

  private connectGraticuleAzimutal() {
    this.startFoldsConnections(0, 0);

    // horizontal first row
    for (let i = 0; i < 2 * this.parallels - 1; i++) {
      this.connectQuadByDirection(0, i, QuadDirection.Right);
    }

    for (let i = 0; i < this.parallels - 1; i++) {
      for (let j = 0; j < this.parallels * 2; j++) {
        this.connectQuadByDirection(i, j, QuadDirection.Down);
      }
    }

    this.root.parent = null;
  }

  private connectGraticulePolyconical() {
    this.startFoldsConnections(0, this.parallels);

    for (let i = 0; i < this.parallels - 1; i++) {
      this.connectQuadByDirection(i, this.parallels, QuadDirection.Down);
    }

    for (let i = 1; i < this.parallels-1; i++) {
      for (let j = this.parallels; j > 0; j--) {
        this.connectQuadByDirection(i, j, QuadDirection.Left);
      }
      for (let j = this.parallels; j < 2 * this.parallels - 1; j++) {
        this.connectQuadByDirection(i, j, QuadDirection.Right);
      }
    }

    for (let i = 0; i < this.parallels*2 - 1; i++) {
      this.connectQuadByDirection(0, i, QuadDirection.Right);
      this.connectQuadByDirection(this.parallels - 1, i, QuadDirection.Right);
    }

  }

  private faceIndexForQuadAt(row: number, column: number, d?: QuadDirection): number {
    return (row * this.parallels * 2 + column) * 2 + (d !== undefined ? 1 : 0);
  }

  private startFoldsConnections(row: number, column: number) {
    this.root = this.connectQuad(row, column);
  }

  private getQuadCommonEdge(row: number, column: number): Edge {
    const o = this.faceIndexForQuadAt(row, column);
    return this.faces.get(o).edges[2];
  }

  private getTriangleEdge(row: number, column: number, inc: number): Edge {

    let e: Edge;

    if (row===0) {

      const o = this.faceIndexForQuadAt(row, column) + 1;
      e = this.faces.get(o).edges[0];
      e.faceIndices[1] = o + inc;

    } else if (row===this.parallels-1) {

      const o = this.faceIndexForQuadAt(row, column) ;
      e = this.faces.get(o).edges[1];
      e.faceIndices[1] = o + inc;
    }

    return e;
  }

  private getTriangleRightEdge(row: number, column: number): Edge {
    return this.getTriangleEdge(row, column, 2);
  }

  private getTriangleLeftEdge(row: number, column: number): Edge {
    return this.getTriangleEdge(row, column, -2);
  }

  private getQuadRightEdge(row: number, column: number): Edge {
    const o = this.faceIndexForQuadAt(row, column);
    return this.faces.get(o).edges[1];
  }

  private getQuadTopEdge(row: number, column: number): Edge {
    const o = this.faceIndexForQuadAt(row, column);
    return this.faces.get(o).edges[0];
  }

  private getQuadBottomEdge(row: number, column: number): Edge {
    const o = this.faceIndexForQuadAt(row, column, QuadDirection.Down);
    return this.faces.get(o).edges[1];
  }

  private getQuadLeftEdge(row: number, column: number): Edge {
    const o = this.faceIndexForQuadAt(row, column, QuadDirection.Left);
    return this.faces.get(o).edges[2];
  }

  private connectQuad(row: number, column: number): FacesEdge {
    let edge = this.connectedQuads.get(row, column);

    if (!edge) {
      edge = new FacesEdge(this.getQuadCommonEdge(row, column));
      this.folds.push(edge);
      this.connectedQuads.insert(row, column, edge);
    }

    return edge;
  }

  private connectQuadByDirection(row: number, column: number, d: QuadDirection): FacesEdge {
    const ne = this.foldByDirection(row, column, d);
    if (ne) {
      this.folds.push(ne);
      return ne;
    } else {
      console.error('nono');
    }

    return undefined;
  }

  private rowWithQuads(r: number): boolean {
    return r > 0 && r < this.parallels - 1;
  }

  private foldByDirection(row: number, column: number, d: QuadDirection): FacesEdge {

    let r: FacesEdge;
    let nq: FacesEdge;

    switch (d) {
      case QuadDirection.Left:
        if (column > 0) {
          if (this.rowWithQuads(row)) {
            nq = this.connectQuad(row, column - 1);
            r = new FacesEdge(this.getQuadLeftEdge(row, column));
          } else {
            r = new FacesEdge(this.getTriangleLeftEdge(row, column));
          }
        }
        break;
      case QuadDirection.Right:
        if (column < 2 * this.parallels - 1) {
          if (this.rowWithQuads(row)) {
            nq = this.connectQuad(row, column + 1);
            r = new FacesEdge(this.getQuadRightEdge(row, column));
          } else {
            r = new FacesEdge(this.getTriangleRightEdge(row, column));
          }
        }
        break;
      case QuadDirection.Top:
        if (row > 0) {
          if (this.rowWithQuads(row-1)) {
            nq = this.connectQuad(row - 1, column);
          }
          r = new FacesEdge(this.getQuadTopEdge(row, column));
        }
        break;
      case QuadDirection.Down:
        if (row < this.parallels - 1) {
          if (this.rowWithQuads(row+1)) {
            nq = this.connectQuad(row + 1, column);
          }
          r = new FacesEdge(this.getQuadBottomEdge(row, column));
        }
        break;
    }

    if (r) {
      r.parent = this.connectedQuads.get(row, column);
      if (nq && !nq.parent) {
        nq.parent = r;
      } else {
        // console.error(`quad fold with parent`);
      }
    }

    return r;
  }

  private static spherical(t: number, u: number) {

    t *= Math.PI * 2;
    u *= Math.PI

    return new Vertex(
      Math.sin(u) * Math.cos(t),
      Math.cos(u),
      Math.sin(u) * Math.sin(t),
    );
  }

  private buildVerticesAndFaces() {
    const rows = this.parallels;
    const cols = this.parallels * 2;

    const vertexPerRow = cols + 1;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const p0 = Graticule.spherical(j / cols, i / rows);
        const p1 = Graticule.spherical((j + 1) / cols, i / rows);
        const p2 = Graticule.spherical((j + 1) / cols, (i + 1) / rows);
        const p3 = Graticule.spherical(j / cols, (i + 1) / rows);

        const fi0 = this.addFace(p0.clone(), p1.clone(), p2.clone());
        fi0.prevVerticesIndices = [
          i * vertexPerRow + j,
          i * vertexPerRow + j + 1,
          (i + 1) * vertexPerRow + j + 1,
        ];

        const fi1 = this.addFace(p0.clone(), p2.clone(), p3.clone());
        fi1.prevVerticesIndices = [
          i * vertexPerRow + j,
          (i + 1) * vertexPerRow + j + 1,
          (i + 1) * vertexPerRow + j,
        ];

        if (fi0[0] !== fi1[0] || fi0[2] !== fi1[1]) {
          console.error(`wrong common axis def`);
        }
      }
    }
  }

  private addVertex(v: Vertex) {
    v.index = this.vertices.length;
    this.vertices.push(v);
  }

  private addFace(p0: Vertex, p1: Vertex, p2: Vertex): FaceInfo {
    this.addVertex(p0);
    this.addVertex(p1);
    this.addVertex(p2);

    const vertices = [p0, p1, p2];
    const fi: FaceInfo = {
      vertices,
      normal: Vertex.normalForVertices(vertices),
      id: this.faces.size,
      prevId: this.faces.size,
      prevVerticesIndices: [p0.index, p1.index, p2.index],
      edges: [
        new Edge(p0.index, p1.index),
        new Edge(p1.index, p2.index),
        new Edge(p2.index, p0.index),
      ],
    }
    this.faces.set(fi.id, fi);

    return fi;
  }

  private setEdgesFaceIndices() {

    // edges connections:
    const rows = this.parallels;
    const cols = this.parallels * 2 * 2;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {

        const faceIndex = j + i * cols;
        const faceInfo = this.faces.get(faceIndex);
        const edges = faceInfo.edges;

        if ((faceIndex % 2) === 0) {
          // top edge. Connect to row above+1
          this.edgeFaceIndices(edges[0], faceIndex, j + 1 + (i - 1) * cols);
          // right edge. connect to index+2
          this.edgeFaceIndices(edges[1], faceIndex, faceIndex + 3);
          // common edge
          this.edgeFaceIndices(edges[2], faceIndex, faceIndex + 1);
        } else {
          // common edge
          this.edgeFaceIndices(edges[0], faceIndex, faceIndex - 1);
          // bottom edge
          this.edgeFaceIndices(edges[1], faceIndex, j + (i + 1) * cols - 1);
          // left edge
          this.edgeFaceIndices(edges[2], faceIndex, faceIndex - 3);
        }
      }
    }
  }

  private edgeFaceIndices(edge: Edge, i0: number, i1: number) {
    if (i1 >= 0 && i1 < this.faces.size) {
      edge.faceIndices[0] = i0;
      edge.faceIndices[1] = i1;
    }
  }
}