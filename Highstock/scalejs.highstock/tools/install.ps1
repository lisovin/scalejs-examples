param($installPath, $toolsPath, $package, $project)

$project | 
	Add-Paths "{
		'scalejs.highstock' : 'Scripts/scalejs.highstock-$($package.Version)',
		'highstock'			: 'Scripts/highstock.src'
	}" |
	Add-Shims "{
		'highstock'			: {
			deps	: ['jQuery'],
			exports : 'Highcharts'
		}
	}" |
	Add-ScalejsExtension 'scalejs.highstock'
    
