param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.highstock, highstock' |
	Remove-Shims 'highstock' |
	Remove-ScalejsExtension 'scalejs.highstock'

