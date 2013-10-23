param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.linq-linqjs' : 'Scripts/scalejs.linq-linqjs-$($package.Version)',
		'linqjs'				  : 'Scripts/linq.min'
	}" |
	Add-ScalejsExtension 'scalejs.linq-linqjs' |
	Out-Null