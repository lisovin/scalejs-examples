param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.mvvm'					: 'Scripts/scalejs.mvvm-$($package.Version)',
		'text'							: 'Scripts/text',
		'knockout'						: 'Scripts/knockout-2.3.0.debug',
		'knockout.mapping'				: 'Scripts/knockout.mapping-latest.debug'
	}" |
	Add-ScalejsExtension 'scalejs.mvvm' |
	Out-Null
