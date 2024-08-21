<script setup>
import { onMounted, ref } from 'vue';

const monthlyCommitData = ref(null);
const hourlyCommitData = ref(null);
const topContributorsData = ref(null);
const userChangesData = ref(null);

const lineOptions = ref(null);
const barOptions = ref(null);
const radarOptions = ref(null);

const stats = ref({});
const errorMessage = ref('');
const successMessage = ref('');

const apiUrl = import.meta.env.VITE_API_URL;

onMounted(async () => {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    try {
        // Fetch data from the API
        const response = await fetch(`${apiUrl}/dashboard/commitFrequency`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch commit frequency data');

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to retrieve dashboard data.');
        }

        // Save the statistics for displaying in the table
        stats.value = {
            totalCommits: Object.values(data.data.user_stats).reduce((sum, user) => sum + user.count, 0),
            totalCodeChanges: Object.values(data.data.user_stats).reduce((sum, user) => sum + user.code_changes, 0),
            totalChanges: Object.values(data.data.user_stats).reduce((sum, user) => sum + user.total_changes, 0),
            topContributor: Object.keys(data.data.user_stats).reduce((a, b) => (data.data.user_stats[a].count > data.data.user_stats[b].count ? a : b))
        };

        // Define a list of colors for each year
        const yearColors = [
            documentStyle.getPropertyValue('--p-danger-500'),
            documentStyle.getPropertyValue('--p-primary-500'),
            documentStyle.getPropertyValue('--p-teal-500'),
            documentStyle.getPropertyValue('--p-purple-500'),
            documentStyle.getPropertyValue('--p-orange-500'),
            documentStyle.getPropertyValue('--p-indigo-500')
            // Add more colors if needed
        ];

        // Monthly Commit Data
        monthlyCommitData.value = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: Object.keys(data.data.monthly_stats).map((year, index) => ({
                label: year,
                data: data.data.monthly_stats[year],
                fill: false,
                borderColor: yearColors[index % yearColors.length],
                tension: 0.4
            }))
        };

        // Hourly Commit Data
        hourlyCommitData.value = {
            labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            datasets: [
                {
                    label: 'Commits',
                    data: data.data.hourly_stats,
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-500')
                }
            ]
        };

        // Top Contributors Data
        topContributorsData.value = {
            labels: Object.keys(data.data.user_stats),
            datasets: [
                {
                    label: 'Commits',
                    data: Object.values(data.data.user_stats).map((user) => user.count),
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-500')
                },
                {
                    label: 'Code Changes (in hundreds)',
                    data: Object.values(data.data.user_stats).map((user) => (user.code_changes / 100).toFixed(0)),
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-300')
                }
            ]
        };

        userChangesData.value = {
            labels: Object.keys(data.data.user_stats),
            datasets: [
                {
                    label: 'Code Changes',
                    data: Object.values(data.data.user_stats).map((user) => ((user.code_changes / user.total_changes) * 100).toFixed(2)),
                    borderColor: documentStyle.getPropertyValue('--p-primary-300'),
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-50')
                }
            ]
        };

        successMessage.value = 'Dashboard data retrieved successfully!';
    } catch (error) {
        errorMessage.value = error.message;
    }

    // Common Chart Options
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
        }
    };
});
</script>

<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Dashboard</h1>

        <div class="flex flex-col gap-4 mb-4" style="min-height: 50px">
            <Message v-if="successMessage" severity="success">{{ successMessage }}</Message>
            <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
        </div>

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
        </div>
    </div>

    <div class="grid grid-cols-12 gap-8">
        <!-- Monthly Commit Activity -->
        <div class="col-span-12 xl:col-span-6">
            <div class="card">
                <div class="font-semibold text-xl mb-4">Monthly Commit Activity</div>
                <Chart type="line" :data="monthlyCommitData" :options="lineOptions"></Chart>
                <p class="mt-4 text-sm text-muted">This chart shows the monthly distribution of commits across different years. It helps identify trends in commit frequency over time.</p>
            </div>
        </div>

        <!-- Hourly Commit Distribution -->
        <div class="col-span-12 xl:col-span-6">
            <div class="card">
                <div class="font-semibold text-xl mb-4">Hourly Commit Distribution</div>
                <Chart type="bar" :data="hourlyCommitData" :options="barOptions"></Chart>
                <p class="mt-4 text-sm text-muted">This chart illustrates the distribution of commits made during different hours of the day. It highlights peak activity periods.</p>
            </div>
        </div>

        <!-- Top Contributors -->
        <div class="col-span-12 xl:col-span-6">
            <div class="card">
                <div class="font-semibold text-xl mb-4">Top Contributors</div>
                <Chart type="bar" :data="topContributorsData" :options="barOptions"></Chart>
                <p class="mt-4 text-sm text-muted">This chart ranks contributors based on the number of commits and code changes. It showcases the most active developers.</p>
            </div>
        </div>

        <!-- Repository Changes -->
        <div class="col-span-12 xl:col-span-6">
            <div class="card">
                <div class="font-semibold text-xl mb-4">Repository Changes</div>
                <Chart type="radar" :data="userChangesData" :options="radarOptions"></Chart>
                <p class="mt-4 text-sm text-muted">This radar chart compares the percentage of code changes across different contributors, providing insights into the code quality and contribution balance.</p>
            </div>
        </div>
    </div>
</template>
