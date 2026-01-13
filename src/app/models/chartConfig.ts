import { ChartConfiguration, ChartData, ChartOptions, ChartType } from 'chart.js';

export interface DashboardChartConfig {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
}

export const defaultChartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        font: { size: 11, weight: '500' },
        boxWidth: 8,
        padding: 10,
        usePointStyle: true
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#1a202c',
      bodyColor: '#4a5568',
      borderColor: 'rgba(218, 38, 28, 0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
      displayColors: true
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { display: true, color: 'rgba(0,0,0,0.03)' },
      ticks: { font: { size: 10 } }
    },
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 } }
    }
  }
};

export const createBarChartConfig = (data: ChartData): DashboardChartConfig => ({
  type: 'bar',
  data,
  options: {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: 'Bar Chart Analytics',
        font: { size: 13, weight: '600' },
        padding: { bottom: 15 }
      }
    }
  }
});

export const createLineChartConfig = (data: ChartData): DashboardChartConfig => ({
  type: 'line',
  data,
  options: {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      title: {
        display: true,
        text: 'Line Chart Analytics',
        font: { size: 13, weight: '600' },
        padding: { bottom: 15 }
      }
    }
  }
});

export const createPieChartConfig = (data: ChartData): DashboardChartConfig => ({
  type: 'pie',
  data,
  options: {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        position: 'right'
      },
      title: {
        display: true,
        text: 'Distribution Overview',
        font: { size: 13, weight: '600' },
        padding: { bottom: 15 }
      }
    }
  }
});

export const createDoughnutChartConfig = (data: ChartData): DashboardChartConfig => ({
  type: 'doughnut',
  data,
  options: {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        ...defaultChartOptions.plugins.legend,
        position: 'right'
      },
      title: {
        display: true,
        text: 'Doughnut Chart Overview',
        font: { size: 13, weight: '600' },
        padding: { bottom: 15 }
      }
    }
  }
});