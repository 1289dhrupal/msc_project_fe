<script setup>
import { useLayout } from '@/layout/composables/layout'; // Assuming you have this composable
import { useToast } from 'primevue/usetoast';
import { onMounted, ref, watch } from 'vue';

const monthlyCommitData = ref(null);
const hourlyCommitData = ref(null);
const topContributorsData = ref(null);
const userChangesData = ref(null);

const lineOptions = ref(null);
const barOptions = ref(null);
const radarOptions = ref(null);

const chartData = ref({});
const stats = ref({});
const toast = useToast();

const { getPrimary, getSurface, isDarkTheme } = useLayout();
const apiUrl = import.meta.env.VITE_API_URL;

onMounted(async () => {
    await fetchDataAndInitializeCharts();
});

async function fetchDataAndInitializeCharts() {
    try {
        const response = await fetch(`${apiUrl}/dashboard/overallStats`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch commit frequency data');

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to retrieve dashboard data.');
        }

        // Set statistics
        stats.value = {
            totalCommits: Object.values(data.data.user_stats).reduce((sum, user) => sum + user.count, 0),
            totalCodeChanges: Object.values(data.data.user_stats).reduce((sum, user) => sum + user.code_changes, 0),
            totalChanges: Object.values(data.data.user_stats).reduce((sum, user) => sum + user.total_changes, 0),
            topContributor: Object.keys(data.data.user_stats).reduce((a, b) => (data.data.user_stats[a].count > data.data.user_stats[b].count ? a : b))
        };

        chartData.value = data.data;

        // Initialize chart data and options
        initializeCharts();
        toast.add({ severity: 'success', summary: 'Successfull', detail: 'Dashboard data retrieved successfully!', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
}

function initializeCharts() {
    const documentStyle = getComputedStyle(document.documentElement);

    const yearColors = [
        documentStyle.getPropertyValue('--p-cyan-500'),
        documentStyle.getPropertyValue('--p-primary-500'),
        documentStyle.getPropertyValue('--p-teal-500'),
        documentStyle.getPropertyValue('--p-purple-500'),
        documentStyle.getPropertyValue('--p-orange-500'),
        documentStyle.getPropertyValue('--p-indigo-500')
    ];

    monthlyCommitData.value = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: Object.keys(chartData.value.monthly_stats).map((year, index) => ({
            label: year,
            data: chartData.value.monthly_stats[year],
            fill: false,
            borderColor: yearColors[index % yearColors.length],
            tension: 0.4
        }))
    };

    hourlyCommitData.value = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [
            {
                label: 'Commits',
                data: chartData.value.hourly_stats,
                backgroundColor: documentStyle.getPropertyValue('--p-primary-500')
            }
        ]
    };

    topContributorsData.value = {
        labels: Object.keys(chartData.value.user_stats),
        datasets: [
            {
                label: 'Commits',
                data: Object.values(chartData.value.user_stats).map((user) => user.count),
                backgroundColor: documentStyle.getPropertyValue('--p-primary-500')
            },
            {
                label: 'Code Changes (in thousands)',
                data: Object.values(chartData.value.user_stats).map((user) => (user.code_changes / 1000).toFixed(2)),
                backgroundColor: documentStyle.getPropertyValue('--p-primary-300')
            }
        ]
    };

    userChangesData.value = {
        labels: Object.keys(chartData.value.user_stats),
        datasets: [
            {
                label: 'Code Changes',
                data: Object.values(chartData.value.user_stats).map((user) => ((user.code_changes / user.total_changes) * 100).toFixed(2)),
                borderColor: documentStyle.getPropertyValue('--p-primary-300'),
                backgroundColor: documentStyle.getPropertyValue('--p-primary-50')
            }
        ]
    };

    setChartOptions(documentStyle);
}

function setChartOptions(documentStyle) {
    const textColor = documentStyle.getPropertyValue('--text-color');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    lineOptions.value = {
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColor
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColor
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            }
        }
    };

    barOptions.value = {
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColor
                },
                grid: {
                    display: false,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColor
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            }
        }
    };

    radarOptions.value = {
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            }
        },
        scales: {
            r: {
                grid: {
                    color: textColor
                },
                suggestedMin: 50,
                suggestedMax: 100
            }
        },
        height: 10
    };
}

watch([getPrimary, getSurface, isDarkTheme], () => {
    const documentStyle = getComputedStyle(document.documentElement);
    initializeCharts(null, documentStyle); // Pass the documentStyle to reinitialize the charts
});
</script>

<template>
    <div class="pt-4">
        <h1 class="text-2xl font-bold mb-4">Dashboard</h1>

        <div class="grid grid-cols-12 gap-8">
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Total Commits</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ stats.totalCommits }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-github text-blue-500 !text-xl"></i>
                        </div>
                    </div>
                    <!-- <span class="text-primary font-medium">24 new </span>
                    <span class="text-muted-color">since last visit</span> -->
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Total Code Changes</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ stats.totalCodeChanges }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-code text-orange-500 !text-xl"></i>
                        </div>
                    </div>
                    <!-- <span class="text-primary font-medium">%52+ </span>
                    <span class="text-muted-color">since last week</span> -->
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Total Changes</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ stats.totalChanges }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-file-edit text-cyan-500 !text-xl"></i>
                        </div>
                    </div>
                    <!-- <span class="text-primary font-medium">520 </span>
                    <span class="text-muted-color">newly registered</span> -->
                </div>
            </div>
            <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                <div class="card mb-0">
                    <div class="flex justify-between mb-4">
                        <div>
                            <span class="block text-muted-color font-medium mb-4">Top Contributor</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ stats.topContributor }}</div>
                        </div>
                        <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                            <i class="pi pi-user text-purple-500 !text-xl"></i>
                        </div>
                    </div>
                    <!-- <span class="text-primary font-medium">85 </span>
                    <span class="text-muted-color">responded</span> -->
                </div>
            </div>

            <div class="col-span-12 xl:col-span-6">
                <!-- Monthly Commit Activity -->
                <div class="card">
                    <div class="font-semibold text-xl mb-4">Monthly Commit Activity</div>
                    <Chart type="line" :data="monthlyCommitData" :options="lineOptions"></Chart>
                    <p class="mt-4 text-sm text-muted">This chart shows the monthly distribution of commits across different years. It helps identify trends in commit frequency over time.</p>
                </div>
                <!-- Hourly Commit Distribution -->
                <div class="card">
                    <div class="font-semibold text-xl mb-4">Hourly Commit Distribution</div>
                    <Chart type="bar" :data="hourlyCommitData" :options="barOptions"></Chart>
                    <p class="mt-4 text-sm text-muted">This chart illustrates the distribution of commits made during different hours of the day. It highlights peak activity periods.</p>
                </div>
            </div>

            <div class="col-span-12 xl:col-span-6">
                <!-- Top Contributors -->
                <div class="card">
                    <div class="font-semibold text-xl mb-4">Top Contributors</div>
                    <Chart type="bar" :data="topContributorsData" :options="barOptions"></Chart>
                    <p class="mt-4 text-sm text-muted">This chart ranks contributors based on the number of commits and code changes. It showcases the most active developers.</p>
                </div>
                <!-- Repository Changes -->
                <div class="card">
                    <div class="font-semibold text-xl mb-4">Repository Changes</div>
                    <Chart type="radar" :data="userChangesData" :options="radarOptions"></Chart>
                    <p class="mt-4 text-sm text-muted">This radar chart compares the percentage of code changes across different contributors, providing insights into the code quality and contribution balance.</p>
                </div>
            </div>
        </div>
    </div>
</template>
<style lang="scss" scoped></style>
