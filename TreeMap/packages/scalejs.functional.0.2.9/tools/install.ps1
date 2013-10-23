param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.functional' : 'Scripts/scalejs.functional-$($package.Version)'
	}" |
	Add-ScalejsExtension 'scalejs.functional' |
	Out-Null