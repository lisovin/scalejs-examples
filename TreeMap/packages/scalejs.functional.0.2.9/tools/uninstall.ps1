param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.functional' |
	Remove-ScalejsExtension 'scalejs.functional' |
	Out-Null
