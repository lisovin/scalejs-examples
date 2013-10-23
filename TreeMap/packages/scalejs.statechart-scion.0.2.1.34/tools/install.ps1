param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.statechart-scion' : 'Scripts/scalejs.statechart-scion-$($package.Version)',
		'scion': 'Scripts/scion'
	}" |
	Add-Shims "{
			'scalejs.statechart-scion' : {
				deps : ['scalejs.linq-linqjs', 'scalejs.functional']
			}
		}" |
	Add-ScalejsExtension 'scalejs.statechart-scion' |
	Out-Null
