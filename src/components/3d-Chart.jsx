import { deptColors } from "../utils/DeptColors";
import { employeeData } from "../utils/EmployeeData";

  // 3D Scatter Plot Data
export const scatter3dData = [{
    type: 'scatter3d',
    mode: 'markers',
    x: employeeData.map(e => e.salary),
    y: employeeData.map(e => e.performance),
    z: employeeData.map(e => e.tenure),
    text: employeeData.map(e => `${e.name}<br>Dept: ${e.department}<br>Salary: $${e.salary.toLocaleString()}<br>Performance: ${e.performance}<br>Tenure: ${e.tenure}y`),
    marker: {
      size: employeeData.map(e => e.age / 2),
      color: employeeData.map(e => deptColors[e.department]),
      opacity: 0.8,
      line: {
        color: '#fff',
        width: 1
      }
    },
    hovertemplate: '%{text}<extra></extra>'
  }];

  // 3D Surface Plot - Department Performance
  export const createSurfaceData = () => {
    const departments = ['Engineering', 'Sales', 'Marketing', 'HR'];
    const metrics = ['Avg Salary', 'Avg Performance', 'Avg Tenure'];
    
    const z = departments.map(dept => {
      const deptEmployees = employeeData.filter(e => e.department === dept);
      return [
        deptEmployees.reduce((sum, e) => sum + e.salary, 0) / deptEmployees.length / 1000,
        deptEmployees.reduce((sum, e) => sum + e.performance, 0) / deptEmployees.length * 20,
        deptEmployees.reduce((sum, e) => sum + e.tenure, 0) / deptEmployees.length * 10
      ];
    });

    return [{
      type: 'surface',
      z: z,
      x: metrics,
      y: departments,
      colorscale: 'Viridis',
      showscale: true,
      hovertemplate: 'Department: %{y}<br>Metric: %{x}<br>Value: %{z:.2f}<extra></extra>'
    }];
  };

  // 3D Bubble Chart by Location
  export const bubbleData = () => {
    const locations = ['New York', 'San Francisco', 'Chicago', 'Los Angeles'];
    const traces = locations.map((loc) => {
      const locEmployees = employeeData.filter(e => e.location === loc);
      return {
        type: 'scatter3d',
        mode: 'markers',
        name: loc,
        x: locEmployees.map(e => e.salary),
        y: locEmployees.map(e => e.performance),
        z: locEmployees.map(e => e.age),
        text: locEmployees.map(e => `${e.name}<br>${e.department}<br>$${e.salary.toLocaleString()}`),
        marker: {
          size: locEmployees.map(e => e.tenure * 3),
          opacity: 0.7,
        },
        hovertemplate: '%{text}<extra></extra>'
      };
    });
    return traces;
  };

  