export const lineChartOptions = (labels: string[], data: number[]) => ({
    tooltip: {
        trigger: "axis",
        axisPointer: {
            type: "cross",
            label: { backgroundColor: "#171717" },
        },
    },
    grid: {
        top: "3%",
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
    },
    xAxis: [
        {
            type: "category",
            data: labels.length
                ? labels
                : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        },
    ],
    yAxis: [{ type: "value" }],
    series: [
        {
            color: "#31D88A",
            name: "Balance",
            type: "line",
            stack: "Total",
            areaStyle: {},
            emphasis: { focus: "series" },
            data: data.length ? data : [0, 0, 0, 0, 0, 0, 0],
        },
    ],
});

export const pieChartOptions = (data: { name: string; value: number }[]) => ({
    tooltip: { trigger: "item" },
    visualMap: {
        show: false,
        min: 80,
        max: 600,
        inRange: { colorLightness: [0.9, 0.2] },
    },
    series: [
        {
            name: "Spending",
            type: "pie",
            radius: "55%",
            center: ["50%", "50%"],
            data: data.sort((a, b) => a.value - b.value),
            label: { color: "rgba(255, 255, 255, 1)" },
            labelLine: {
                lineStyle: { color: "rgba(255, 255, 255, 0.3)" },
                smooth: 0.2,
                length: 10,
                length2: 20,
            },
            itemStyle: {
                color: "#28a745",
                shadowBlur: 200,
                shadowColor: "rgba(0, 0, 0, 0.5)",
            },
            animationType: "scale",
            animationEasing: "elasticOut",
            animationDelay: (idx: Number) => Math.random() * 200,
        },
    ],
});

export const treemapChartOptions = (data: any[]) => ({
    tooltip: {
        trigger: 'item',
        formatter: (info: any) =>
            info.value < 0 ? `Total Spending: $${(-info.value).toLocaleString()}` : ''
    },
    series: [{
        name: 'Spending Categories',
        type: 'treemap',
        data,
        label: { show: true, formatter: '{b}' },
        itemStyle: {
            borderColor: 'transparent',
            borderWidth: 1,
            gapWidth: 1,
        },
        visualMin: 0,
        visualMax: 100,
        levels: [
            {
                itemStyle: {
                    borderWidth: 3,
                    borderColor: 'transparent',
                    gapWidth: 0,
                }
            },
            {
                color: ["rgba(25, 105, 70, 1)", "rgba(0, 194, 103)"],
                colorMappingBy: 'value',
                itemStyle: {
                    gapWidth: 0
                }
            }
        ],

    }]
});
