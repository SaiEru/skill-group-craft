// K-Means clustering implementation

interface Student {
  name: string;
  skills: number[];
  skillNames?: string[];
}

interface ClusteredStudent extends Student {
  cluster: number;
  groupNumber: number;
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0));
}

function randomCentroids(data: number[][], k: number): number[][] {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, k);
}

function assignClusters(data: number[][], centroids: number[][]): number[] {
  return data.map((point) => {
    let minDist = Infinity;
    let cluster = 0;
    centroids.forEach((centroid, i) => {
      const dist = euclideanDistance(point, centroid);
      if (dist < minDist) {
        minDist = dist;
        cluster = i;
      }
    });
    return cluster;
  });
}

function updateCentroids(data: number[][], assignments: number[], k: number): number[][] {
  const dims = data[0]?.length || 0;
  const centroids: number[][] = Array.from({ length: k }, () => new Array(dims).fill(0));
  const counts = new Array(k).fill(0);

  data.forEach((point, i) => {
    const cluster = assignments[i];
    counts[cluster]++;
    point.forEach((val, d) => {
      centroids[cluster][d] += val;
    });
  });

  return centroids.map((centroid, i) =>
    counts[i] > 0 ? centroid.map((val) => val / counts[i]) : centroid
  );
}

export function kMeansClustering(students: Student[], groupSize: number): ClusteredStudent[] {
  if (students.length === 0) return [];

  const k = Math.max(1, Math.round(students.length / groupSize));
  const data = students.map((s) => s.skills);
  let centroids = randomCentroids(data, k);
  let assignments = assignClusters(data, centroids);

  // Run iterations
  for (let iter = 0; iter < 100; iter++) {
    const newCentroids = updateCentroids(data, assignments, k);
    const newAssignments = assignClusters(data, newCentroids);

    // Check convergence
    if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) break;

    centroids = newCentroids;
    assignments = newAssignments;
  }

  // Map cluster IDs to group numbers (1-indexed)
  const clusterToGroup = new Map<number, number>();
  let groupCounter = 1;
  assignments.forEach((cluster) => {
    if (!clusterToGroup.has(cluster)) {
      clusterToGroup.set(cluster, groupCounter++);
    }
  });

  return students.map((student, i) => ({
    ...student,
    cluster: assignments[i],
    groupNumber: clusterToGroup.get(assignments[i])!,
  }));
}

export function parseCSV(csvText: string): { students: Student[]; skillHeaders: string[] } {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return { students: [], skillHeaders: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const skillHeaders = headers.slice(1);

  const students = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const name = values[0] || "Unknown";
    const skills = values.slice(1).map((v) => {
      const num = parseFloat(v);
      return isNaN(num) ? 0 : num;
    });
    return { name, skills, skillNames: skillHeaders };
  });

  return { students, skillHeaders };
}

export type { Student, ClusteredStudent };
