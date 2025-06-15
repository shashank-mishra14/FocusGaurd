let currentPeriod = 7;
let dailyChart = null;
let pieChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadAnalytics();
});

function setupEventListeners() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      // Update active button
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      currentPeriod = parseInt(e.target.dataset.period);
      await loadAnalytics();
    });
  });
}

async function loadAnalytics() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAnalytics',
      period: currentPeriod
    });
    
    if (response && response.success && response.data) {
      displayCharts(response.data);
      displayStats(response.data);
      displaySitesBreakdown(response.data);
    } else {
      console.error('Failed to load analytics:', response);
      showNoData();
    }
    
  } catch (error) {
    console.error('Error loading analytics:', error);
    showNoData();
  }
}

function displayCharts(analytics) {
  // Prepare data for charts
  const dates = [];
  const now = new Date();
  
  for (let i = currentPeriod - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toLocaleDateString());
  }
  
  // Daily chart data
  const dailyData = {};
  Object.keys(analytics).forEach(domain => {
    dailyData[domain] = dates.map(date => {
      const dateObj = new Date(date);
      const dateString = dateObj.toDateString();
      return (analytics[domain].dailyData[dateString] || 0) / 60000; // Convert to minutes
    });
  });
  
  // Create/update daily chart
  const dailyCtx = document.getElementById('dailyChart').getContext('2d');
  
  if (dailyChart) {
    dailyChart.destroy();
  }
  
  const datasets = Object.keys(dailyData).slice(0, 5).map((domain, index) => ({
    label: domain,
    data: dailyData[domain],
    borderColor: getColor(index),
    backgroundColor: getColor(index, 0.1),
    fill: false,
    tension: 0.4
  }));
  
  dailyChart = new Chart(dailyCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Minutes'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
  
  // Pie chart data
  const pieData = Object.keys(analytics)
    .map(domain => ({
      domain,
      time: analytics[domain].totalTime / 60000 // Convert to minutes
    }))
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);
  
  if (pieData.length > 0) {
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    
    if (pieChart) {
      pieChart.destroy();
    }
    
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: pieData.map(item => item.domain),
        datasets: [{
          data: pieData.map(item => item.time),
          backgroundColor: pieData.map((_, index) => getColor(index)),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
}

function displayStats(analytics) {
  const statsContent = document.getElementById('statsContent');
  
  let totalTime = 0;
  let totalSites = 0;
  let mostUsedSite = '';
  let mostUsedTime = 0;
  
  Object.keys(analytics).forEach(domain => {
    const siteTime = analytics[domain].totalTime;
    totalTime += siteTime;
    totalSites++;
    
    if (siteTime > mostUsedTime) {
      mostUsedTime = siteTime;
      mostUsedSite = domain;
    }
  });
  
  const avgDaily = totalSites > 0 ? totalTime / currentPeriod / 60000 : 0;
  
  statsContent.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${formatTime(totalTime)}</div>
      <div class="stat-label">Total Time (${currentPeriod} days)</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${Math.round(avgDaily)}m</div>
      <div class="stat-label">Average Daily</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${totalSites}</div>
      <div class="stat-label">Sites Tracked</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${mostUsedSite.substring(0, 20)}${mostUsedSite.length > 20 ? '...' : ''}</div>
      <div class="stat-label">Most Used Site</div>
    </div>
  `;
}

function displaySitesBreakdown(analytics) {
  const sitesBreakdown = document.getElementById('sitesBreakdown');
  
  const sortedSites = Object.keys(analytics)
    .map(domain => ({
      domain,
      totalTime: analytics[domain].totalTime,
      averageDaily: analytics[domain].averageDaily
    }))
    .sort((a, b) => b.totalTime - a.totalTime);
  
  if (sortedSites.length === 0) {
    sitesBreakdown.innerHTML = '<p class="no-data">No data available</p>';
    return;
  }
  
  sitesBreakdown.innerHTML = sortedSites.map(site => `
    <div class="site-breakdown-item">
      <div class="site-header">
        <strong>${site.domain}</strong>
        <span class="site-total">${formatTime(site.totalTime)}</span>
      </div>
      <div class="site-stats">
        <span>Daily Average: ${formatTime(site.averageDaily)}</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(site.totalTime / sortedSites[0].totalTime) * 100}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function showNoData() {
  const statsContent = document.getElementById('statsContent');
  const sitesBreakdown = document.getElementById('sitesBreakdown');
  
  statsContent.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">0</div>
      <div class="stat-label">Total Time (${currentPeriod} days)</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">0m</div>
      <div class="stat-label">Average Daily</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">0</div>
      <div class="stat-label">Sites Tracked</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">-</div>
      <div class="stat-label">Most Used Site</div>
    </div>
  `;
  
  sitesBreakdown.innerHTML = '<p class="no-data">No tracking data available. Visit some websites to see your analytics!</p>';
  
  // Hide charts
  const dailyCanvas = document.getElementById('dailyChart');
  const pieCanvas = document.getElementById('pieChart');
  
  if (dailyCanvas) {
    const ctx = dailyCanvas.getContext('2d');
    ctx.clearRect(0, 0, dailyCanvas.width, dailyCanvas.height);
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', dailyCanvas.width / 2, dailyCanvas.height / 2);
  }
  
  if (pieCanvas) {
    const ctx = pieCanvas.getContext('2d');
    ctx.clearRect(0, 0, pieCanvas.width, pieCanvas.height);
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', pieCanvas.width / 2, pieCanvas.height / 2);
  }
}

function getColor(index, alpha = 1) {
  const colors = [
    `rgba(102, 126, 234, ${alpha})`,
    `rgba(118, 75, 162, ${alpha})`,
    `rgba(255, 71, 87, ${alpha})`,
    `rgba(255, 159, 64, ${alpha})`,
    `rgba(75, 192, 192, ${alpha})`,
    `rgba(153, 102, 255, ${alpha})`,
    `rgba(255, 205, 86, ${alpha})`,
    `rgba(201, 203, 207, ${alpha})`
  ];
  return colors[index % colors.length];
}

function formatTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
} 